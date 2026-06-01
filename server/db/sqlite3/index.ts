import Database from "better-sqlite3";

import CONST from "../../lib/constants.js";
import { NotFoundError } from "../../lib/errors.js";
import config from "../../lib/config/index.js";
import logger from "../../lib/logger.js";
import { acceptLocalizedCity } from "../../lib/localized-script.js";
import { migrate } from "./migrate.js";

import schemaFactory, {
  type Gallery,
  type GalleryInput,
  type GalleryPhoto,
  type GalleryRow,
  type Group,
  type GroupGalleryRow,
  type GroupRow,
  type MetaRow,
  type PhotoInput,
  type PhotoLocalizedRow,
  type PhotoRow,
  type SessionRow,
  type User,
  type UserGalleryRow,
  type UserGroupRow,
  type UserRow,
} from "./schema.js";

const SCHEMA = schemaFactory();

export default () => {
  return {
    loadMetas,
    createMeta,
    loadMeta,
    updateMeta,
    deleteMeta,

    loadUsers,
    createUser,
    loadUser,
    updateUser,
    deleteUser,

    createSession,
    loadSession,
    updateSession,
    deleteSession,
    deleteUserSessions,

    resolveAccessLevel,
    loadUserGalleryRows,
    upsertUserGallery,
    deleteUserGallery,
    resolveHideMap,

    loadGroups,
    loadGroup,
    createGroup,
    updateGroup,
    deleteGroup,
    loadGroupMembers,
    loadUserGroups,
    addUserGroup,
    removeUserGroup,
    loadGroupGalleryRows,
    upsertGroupGallery,
    deleteGroupGallery,

    loadGalleries,
    createGallery,
    loadGallery,
    updateGallery,
    deleteGallery,

    loadGalleryPhotos,
    linkGalleryPhoto,
    unlinkGalleryPhoto,
    unlinkAllPhotos,
    unlinkAllGalleries,
    loadGalleryPhoto,

    loadPhotos,
    createPhoto,
    loadPhoto,
    loadPhotosByOriginalFilename,
    loadOrphanPhotoIds,
    loadOrphanGalleryPhotoLinks,
    loadEmptyGalleryIds,
    loadOrphanUserGalleryRows,
    updatePhoto,
    renamePhoto,
    upsertGeocoded,
    markGeocodeNoData,
    loadPhotosMissingGeocoded,
    deletePhoto,
    loadPhotoLocalized,
    clearLocalizedCity,
  };
};

if (!config.DB_OPTS) {
  throw "The path to the SQLite3 database must be set to DB_OPTS.";
}
const db = new Database(config.DB_OPTS);
logger.debug("Connected to DB");
migrate(db);

const deleteById = (
  schema: { buildDeleteByIdQuery: () => string },
  id: string
) => {
  db.prepare(schema.buildDeleteByIdQuery()).run([id]);
};

const loadMetas = async () => {
  const rows = db.prepare(SCHEMA.meta.buildSelectQuery()).all() as MetaRow[];
  return rows.map(SCHEMA.meta.mapRow);
};
const createMeta = async (meta: { key: string; value: string }) => {
  db.prepare(SCHEMA.meta.buildCreateQuery()).run(SCHEMA.meta.mapInsert(meta));
};
const loadMeta = async (key: string) => {
  const row = db.prepare(SCHEMA.meta.buildSelectByIdQuery()).get(key) as
    | MetaRow
    | undefined;
  if (!row) throw new NotFoundError();
  return SCHEMA.meta.mapRow(row);
};
const updateMeta = async (key: string, meta: Partial<MetaRow>) => {
  const { query, values } = SCHEMA.meta.buildUpdateByIdQuery(meta);
  if (!query || !values) return;
  db.prepare(query).run([...values, key]);
};
const deleteMeta = async (key: string) => deleteById(SCHEMA.meta, key);

const loadUsers = async () => {
  const rows = db.prepare(SCHEMA.user.buildSelectQuery()).all() as UserRow[];
  return rows.map(SCHEMA.user.mapRow);
};
const createUser = async (user: User) => {
  db.prepare(SCHEMA.user.buildCreateQuery()).run(SCHEMA.user.mapInsert(user));
};
const loadUser = async (userId: string) => {
  const row = db.prepare(SCHEMA.user.buildSelectByIdQuery()).get(userId) as
    | UserRow
    | undefined;
  if (!row) throw new NotFoundError();
  return SCHEMA.user.mapRow(row);
};
const updateUser = async (userId: string, user: Partial<User>) => {
  const { query, values } = SCHEMA.user.buildUpdateByIdQuery(user);
  if (!query || !values) return;
  db.prepare(query).run([...values, userId]);
};
const deleteUser = async (userId: string) => deleteById(SCHEMA.user, userId);

const createSession = async (session: SessionRow): Promise<void> => {
  db.prepare(SCHEMA.session.buildCreateQuery()).run(
    SCHEMA.session.mapInsert(session)
  );
};
const loadSession = async (
  sessionId: string
): Promise<SessionRow | undefined> => {
  const row = db
    .prepare(SCHEMA.session.buildSelectByIdQuery())
    .get(sessionId) as SessionRow | undefined;
  return row ? SCHEMA.session.mapRow(row) : undefined;
};
const updateSession = async (
  sessionId: string,
  patch: Partial<SessionRow>
): Promise<void> => {
  const { query, values } = SCHEMA.session.buildUpdateByIdQuery(patch);
  if (!query || !values) return;
  db.prepare(query).run([...values, sessionId]);
};
const deleteSession = async (sessionId: string): Promise<void> =>
  deleteById(SCHEMA.session, sessionId);
// Used by the admin all-sessions revoke and the cascade from
// `bin/user.ts passwd` / secret rotation paths that want a clean slate.
const deleteUserSessions = async (userId: string): Promise<void> => {
  db.prepare("DELETE FROM session WHERE user_id = ?").run(userId);
};

// Resolve access for (userId, galleryId) under the post-#394 model:
//   1. user.is_admin = true                       → global admin (bypass).
//   2. MAX(is_admin) over matching positive rows from
//        user_gallery (user or :guest, this gallery)
//        group_gallery (any group the user belongs to, this gallery)
//      row present → view; is_admin=1 upgrades to gallery admin.
//   3. else                                       → deny.
const resolveAccessLevel = async (
  userId: string,
  galleryId: string
): Promise<{ hasAccess: boolean; isAdmin: boolean }> => {
  const userRow = db
    .prepare("SELECT is_admin FROM user WHERE id = ?")
    .get(userId) as { is_admin: number } | undefined;
  if (userRow && userRow.is_admin) {
    return { hasAccess: true, isAdmin: true };
  }
  // UNION ALL of the two row sources, then MAX. Sub-queries are cheap on
  // the small tables involved; explicit form reads better than a JOIN.
  const grantRow = db
    .prepare(
      `SELECT MAX(is_admin) AS is_admin FROM (
         SELECT is_admin FROM user_gallery
           WHERE user_id IN (?, ':guest') AND gallery_id = ?
         UNION ALL
         SELECT is_admin FROM group_gallery
           WHERE gallery_id = ?
             AND group_id IN (SELECT group_id FROM user_group WHERE user_id = ?)
       )`
    )
    .get(userId, galleryId, galleryId, userId) as
    | { is_admin: number | null }
    | undefined;
  if (grantRow?.is_admin === null || grantRow?.is_admin === undefined) {
    return { hasAccess: false, isAdmin: false };
  }
  return { hasAccess: true, isAdmin: !!grantRow.is_admin };
};

const loadUserGalleryRows = async (
  filter: { userId?: string; galleryId?: string } = {}
): Promise<UserGalleryRow[]> => {
  const conditions: string[] = [];
  const values: string[] = [];
  if (filter.userId) {
    conditions.push("user_id = ?");
    values.push(filter.userId);
  }
  if (filter.galleryId) {
    conditions.push("gallery_id = ?");
    values.push(filter.galleryId);
  }
  return db
    .prepare(SCHEMA.userGallery.buildSelectQuery(conditions))
    .all(...values) as UserGalleryRow[];
};

const upsertUserGallery = async (
  row: {
    user_id: string;
    gallery_id: string;
    is_admin?: boolean;
    hide_map?: number | null;
  }
): Promise<void> => {
  // Only touch the columns the caller passed (everything else is preserved on
  // conflict). Done with SQLite's INSERT ON CONFLICT DO UPDATE so a single
  // statement handles both the create and the partial-update path.
  const sets: string[] = [];
  if ("is_admin" in row) sets.push("is_admin = excluded.is_admin");
  if ("hide_map" in row) sets.push("hide_map = excluded.hide_map");
  const query =
    "INSERT INTO user_gallery (user_id, gallery_id, is_admin, hide_map) " +
    "VALUES (?, ?, ?, ?) " +
    `ON CONFLICT(user_id, gallery_id) DO UPDATE SET ${sets.join(", ")}`;
  db.prepare(query).run(
    row.user_id,
    row.gallery_id,
    row.is_admin ? 1 : 0,
    row.hide_map ?? null
  );
};

const deleteUserGallery = async (
  userId: string,
  galleryId: string
): Promise<void> => {
  db.prepare(SCHEMA.userGallery.buildDeleteByIdQuery()).run([
    userId,
    galleryId,
  ]);
};

// Groups
const loadGroups = async () => {
  const rows = db.prepare(SCHEMA.group.buildSelectQuery()).all() as GroupRow[];
  return rows.map(SCHEMA.group.mapRow);
};
const loadGroup = async (groupId: string) => {
  const row = db.prepare(SCHEMA.group.buildSelectByIdQuery()).get(groupId) as
    | GroupRow
    | undefined;
  if (!row) throw new NotFoundError();
  return SCHEMA.group.mapRow(row);
};
const createGroup = async (group: Group) => {
  db.prepare(SCHEMA.group.buildCreateQuery()).run(SCHEMA.group.mapInsert(group));
};
const updateGroup = async (groupId: string, patch: Partial<Group>) => {
  const { query, values } = SCHEMA.group.buildUpdateByIdQuery(patch);
  if (!query || !values) return;
  db.prepare(query).run([...values, groupId]);
};
const deleteGroup = async (groupId: string): Promise<void> => {
  // FK cascade clears user_group + group_gallery rows automatically.
  db.prepare(SCHEMA.group.buildDeleteByIdQuery()).run([groupId]);
};

// Group members (user_group)
const loadGroupMembers = async (groupId: string): Promise<string[]> => {
  const rows = db
    .prepare("SELECT user_id FROM user_group WHERE group_id = ? ORDER BY user_id ASC")
    .all(groupId) as Array<{ user_id: string }>;
  return rows.map((r) => r.user_id);
};
const loadUserGroups = async (userId: string): Promise<string[]> => {
  const rows = db
    .prepare("SELECT group_id FROM user_group WHERE user_id = ? ORDER BY group_id ASC")
    .all(userId) as Array<{ group_id: string }>;
  return rows.map((r) => r.group_id);
};
const addUserGroup = async (userId: string, groupId: string): Promise<void> => {
  db.prepare(
    "INSERT OR IGNORE INTO user_group (user_id, group_id) VALUES (?, ?)"
  ).run(userId, groupId);
};
const removeUserGroup = async (
  userId: string,
  groupId: string
): Promise<void> => {
  db.prepare(
    "DELETE FROM user_group WHERE user_id = ? AND group_id = ?"
  ).run(userId, groupId);
};

// Group grants on galleries (group_gallery)
const loadGroupGalleryRows = async (
  filter: { groupId?: string; galleryId?: string } = {}
): Promise<GroupGalleryRow[]> => {
  const conditions: string[] = [];
  const values: string[] = [];
  if (filter.groupId) {
    conditions.push("group_id = ?");
    values.push(filter.groupId);
  }
  if (filter.galleryId) {
    conditions.push("gallery_id = ?");
    values.push(filter.galleryId);
  }
  return db
    .prepare(SCHEMA.groupGallery.buildSelectQuery(conditions))
    .all(...values) as GroupGalleryRow[];
};
const upsertGroupGallery = async (row: {
  group_id: string;
  gallery_id: string;
  is_admin?: boolean;
  hide_map?: number | null;
}): Promise<void> => {
  const sets: string[] = [];
  if ("is_admin" in row) sets.push("is_admin = excluded.is_admin");
  if ("hide_map" in row) sets.push("hide_map = excluded.hide_map");
  const query =
    "INSERT INTO group_gallery (group_id, gallery_id, is_admin, hide_map) " +
    "VALUES (?, ?, ?, ?) " +
    `ON CONFLICT(group_id, gallery_id) DO UPDATE SET ${sets.join(", ")}`;
  db.prepare(query).run(
    row.group_id,
    row.gallery_id,
    row.is_admin ? 1 : 0,
    row.hide_map ?? null
  );
};
const deleteGroupGallery = async (
  groupId: string,
  galleryId: string
): Promise<void> => {
  db.prepare(SCHEMA.groupGallery.buildDeleteByIdQuery()).run([
    groupId,
    galleryId,
  ]);
};
// Resolve the privacy cascade for (userId, galleryId).
//   1. user.is_admin = true                       → 0 (show, bypass).
//   2. user-row hide_map (non-null)               → use it.
//   3. group-row hide_map across user's groups:
//        privacy-first within the layer — any 1 (hide) wins over 0 (show).
//   4. :guest-row hide_map (non-null)             → use it.
//   5. else                                       → undefined (default show).
const resolveHideMap = async (
  userId: string,
  galleryId: string
): Promise<number | undefined> => {
  const userRow = db
    .prepare("SELECT is_admin FROM user WHERE id = ?")
    .get(userId) as { is_admin: number } | undefined;
  if (userRow && userRow.is_admin) return 0;
  const own = db
    .prepare(
      `SELECT hide_map FROM user_gallery
       WHERE user_id = ? AND gallery_id = ? AND hide_map IS NOT NULL`
    )
    .get(userId, galleryId) as { hide_map: number } | undefined;
  if (own) return own.hide_map;
  const group = db
    .prepare(
      `SELECT MAX(hide_map) AS hide_map FROM group_gallery
       WHERE gallery_id = ?
         AND hide_map IS NOT NULL
         AND group_id IN (SELECT group_id FROM user_group WHERE user_id = ?)`
    )
    .get(galleryId, userId) as { hide_map: number | null } | undefined;
  if (group?.hide_map !== null && group?.hide_map !== undefined) {
    return group.hide_map;
  }
  const guest = db
    .prepare(
      `SELECT hide_map FROM user_gallery
       WHERE user_id = ':guest' AND gallery_id = ? AND hide_map IS NOT NULL`
    )
    .get(galleryId) as { hide_map: number } | undefined;
  return guest?.hide_map;
};

const loadGalleries = async () => {
  const rows = db
    .prepare(SCHEMA.gallery.buildSelectQuery())
    .all() as GalleryRow[];
  return rows.map(SCHEMA.gallery.mapRow);
};
const createGallery = async (gallery: Gallery) => {
  db.prepare(SCHEMA.gallery.buildCreateQuery()).run(
    SCHEMA.gallery.mapInsert(gallery)
  );
};
const loadGallery = async (galleryId: string) => {
  const row = db
    .prepare(SCHEMA.gallery.buildSelectByIdQuery())
    .get(galleryId) as GalleryRow | undefined;
  if (!row) throw new NotFoundError();
  return SCHEMA.gallery.mapRow(row);
};
const updateGallery = async (galleryId: string, gallery: GalleryInput) => {
  const { query, values } = SCHEMA.gallery.buildUpdateByIdQuery(gallery);
  if (!query || !values) return;
  db.prepare(query).run([...values, galleryId]);
};
const deleteGallery = async (galleryId: string) =>
  deleteById(SCHEMA.gallery, galleryId);

const loadGalleryPhotos = async (galleryId: string, lang?: string) => {
  const schema = SCHEMA.photo;
  const getQuery = () => {
    switch (galleryId) {
      case CONST.SPECIAL_GALLERY_ALL:
        return schema.buildSelectQuery();
      case CONST.SPECIAL_GALLERY_PUBLIC:
        return schema.buildSelectQuery([
          "id IN (SELECT photo_id FROM gallery_photo)",
        ]);
      default:
        return schema.buildSelectQuery([
          "id IN (SELECT photo_id FROM gallery_photo WHERE gallery_id = ?)",
        ]);
    }
  };

  const stmt = db.prepare(getQuery());
  const rows = (galleryId.startsWith(CONST.SPECIAL_GALLERY_PREFIX)
    ? stmt.all()
    : stmt.all(galleryId)) as PhotoRow[];
  const localized =
    lang && lang !== "en"
      ? loadLocalizedFor(rows.map((r) => r.id), lang)
      : new Map<string, PhotoLocalizedRow>();
  return rows.map((row, index) =>
    schema.mapRow(row, index, localized.get(row.id))
  );
};
const linkGalleryPhoto = async (
  galleryIds: string[],
  photoIds: string[]
) => {
  const stmt = db.prepare(
    SCHEMA.galleryPhoto.buildCreateQuery().replace("INSERT", "INSERT OR IGNORE")
  );
  const insertAll = db.transaction(() => {
    photoIds.forEach((photoId) => {
      galleryIds.forEach((galleryId) => {
        const link: GalleryPhoto = { galleryId, photoId };
        stmt.run(SCHEMA.galleryPhoto.mapInsert(link));
      });
    });
  });
  insertAll();
};
const loadGalleryPhoto = async (
  galleryId: string,
  photoId: string,
  lang?: string
) => {
  if (galleryId === CONST.SPECIAL_GALLERY_ALL) {
    // TODO: fix
    return loadPhoto(photoId, lang);
  }
  const schema = SCHEMA.photo;
  const getQuery = () => {
    switch (galleryId) {
      case CONST.SPECIAL_GALLERY_PUBLIC:
        return schema.buildSelectQuery([
          "id IN (SELECT photo_id FROM gallery_photo)",
          "AND id = ?",
        ]);
      default:
        return schema.buildSelectQuery([
          "id IN (SELECT photo_id FROM gallery_photo WHERE gallery_id = ?)",
          "AND id = ?",
        ]);
    }
  };

  const stmt = db.prepare(getQuery());
  const rows = (galleryId.startsWith(CONST.SPECIAL_GALLERY_PREFIX)
    ? stmt.all(photoId)
    : stmt.all(galleryId, photoId)) as PhotoRow[];
  if (rows.length === 0) {
    throw new NotFoundError();
  }
  const localized =
    lang && lang !== "en"
      ? (db
        .prepare(
          "SELECT * FROM photo_localized WHERE photo_id = ? AND lang = ?"
        )
        .get(photoId, lang) as PhotoLocalizedRow | undefined)
      : undefined;
  return schema.mapRow(rows[0], 0, localized);
};
const unlinkGalleryPhoto = async (galleryId: string, photoId: string) => {
  db.prepare(SCHEMA.galleryPhoto.buildDeleteByIdQuery()).run([
    galleryId,
    photoId,
  ]);
};
const unlinkAllPhotos = async (galleryId: string) => {
  db.prepare(
    SCHEMA.galleryPhoto.buildDeleteQuery(["gallery_id = ?"])
  ).run([galleryId]);
};
const unlinkAllGalleries = async (photoId: string) => {
  db.prepare(SCHEMA.galleryPhoto.buildDeleteQuery(["photo_id = ?"])).run([
    photoId,
  ]);
};

// English is the canonical reverse-geocoded language stored on the
// photo row directly. For other languages, we load the matching
// photo_localized row(s) for the requested ids and merge per-photo
// in mapRow (which takes the localized row as an optional third arg).
const loadLocalizedFor = (
  photoIds: string[],
  lang: string
): Map<string, PhotoLocalizedRow> => {
  if (photoIds.length === 0) return new Map();
  const placeholders = photoIds.map(() => "?").join(",");
  const rows = db
    .prepare(
      `SELECT * FROM photo_localized
        WHERE lang = ? AND photo_id IN (${placeholders})`
    )
    .all(lang, ...photoIds) as PhotoLocalizedRow[];
  const byId = new Map<string, PhotoLocalizedRow>();
  for (const r of rows) byId.set(r.photo_id, r);
  return byId;
};

const loadPhotos = async (lang?: string) => {
  const rows = db.prepare(SCHEMA.photo.buildSelectQuery()).all() as PhotoRow[];
  const localized =
    lang && lang !== "en"
      ? loadLocalizedFor(
        rows.map((r) => r.id),
        lang
      )
      : new Map<string, PhotoLocalizedRow>();
  return rows.map((row, index) =>
    SCHEMA.photo.mapRow(row, index, localized.get(row.id))
  );
};
const createPhoto = async (photo: PhotoInput) => {
  db.prepare(SCHEMA.photo.buildCreateQuery()).run(
    SCHEMA.photo.mapInsert(photo)
  );
};
const loadPhoto = async (photoId: string, lang?: string) => {
  const row = db.prepare(SCHEMA.photo.buildSelectByIdQuery()).get(photoId) as
    | PhotoRow
    | undefined;
  if (!row) throw new NotFoundError();
  const localized =
    lang && lang !== "en"
      ? (db
        .prepare(
          "SELECT * FROM photo_localized WHERE photo_id = ? AND lang = ?"
        )
        .get(photoId, lang) as PhotoLocalizedRow | undefined)
      : undefined;
  return SCHEMA.photo.mapRow(row, 0, localized);
};
const loadPhotosByOriginalFilename = async (originalFilename: string) => {
  const rows = db
    .prepare(SCHEMA.photo.buildSelectQuery(["original_filename = ?"]))
    .all(originalFilename) as PhotoRow[];
  return rows.map((row, index) => SCHEMA.photo.mapRow(row, index));
};
// Photo rows with no gallery_photo link — useful for `bin/photo.ts audit`.
// The SPA doesn't surface orphan photos anywhere; they're a data-drift
// signal the operator might want to clean up (or deliberately keep as
// unfiled, the model allows it).
const loadOrphanPhotoIds = async (): Promise<string[]> => {
  const rows = db
    .prepare(
      "SELECT id FROM photo WHERE id NOT IN (SELECT photo_id FROM gallery_photo) ORDER BY id ASC"
    )
    .all() as Array<{ id: string }>;
  return rows.map((r) => r.id);
};
// gallery_photo rows whose `photo_id` points at a row that no longer
// exists. Surfaces real data corruption — exactly the dailybw FK
// violation the migrate post-check catches.
const loadOrphanGalleryPhotoLinks = async (): Promise<
  Array<{ galleryId: string; photoId: string; missing: "photo" | "gallery" }>
> => {
  const photoMissing = db
    .prepare(
      "SELECT gallery_id, photo_id FROM gallery_photo " +
        "WHERE photo_id NOT IN (SELECT id FROM photo) " +
        "ORDER BY gallery_id ASC, photo_id ASC"
    )
    .all() as Array<{ gallery_id: string; photo_id: string }>;
  const galleryMissing = db
    .prepare(
      "SELECT gallery_id, photo_id FROM gallery_photo " +
        "WHERE gallery_id NOT IN (SELECT id FROM gallery) " +
        "ORDER BY gallery_id ASC, photo_id ASC"
    )
    .all() as Array<{ gallery_id: string; photo_id: string }>;
  return [
    ...photoMissing.map((r) => ({
      galleryId: r.gallery_id,
      photoId: r.photo_id,
      missing: "photo" as const,
    })),
    ...galleryMissing.map((r) => ({
      galleryId: r.gallery_id,
      photoId: r.photo_id,
      missing: "gallery" as const,
    })),
  ];
};
// Gallery IDs with no photos linked. The `:all`/`:public` sentinels
// aren't gallery rows; they don't show up here.
const loadEmptyGalleryIds = async (): Promise<string[]> => {
  const rows = db
    .prepare(
      "SELECT id FROM gallery WHERE id NOT IN (SELECT gallery_id FROM gallery_photo) ORDER BY id ASC"
    )
    .all() as Array<{ id: string }>;
  return rows.map((r) => r.id);
};
// user_gallery rows whose referenced user or gallery is gone. The
// sentinel gallery ids (`:all`, `:public`) are skipped on the gallery
// side — they're never rows in `gallery`.
const loadOrphanUserGalleryRows = async (): Promise<
  Array<{ userId: string; galleryId: string; missing: "user" | "gallery" }>
> => {
  const userMissing = db
    .prepare(
      "SELECT user_id, gallery_id FROM user_gallery " +
        "WHERE user_id != ? AND user_id NOT IN (SELECT id FROM user) " +
        "ORDER BY user_id ASC, gallery_id ASC"
    )
    .all(CONST.GUEST_USER) as Array<{
    user_id: string;
    gallery_id: string;
  }>;
  const galleryMissing = db
    .prepare(
      "SELECT user_id, gallery_id FROM user_gallery " +
        "WHERE gallery_id NOT LIKE ? AND gallery_id NOT IN (SELECT id FROM gallery) " +
        "ORDER BY user_id ASC, gallery_id ASC"
    )
    .all(`${CONST.SPECIAL_GALLERY_PREFIX}%`) as Array<{
    user_id: string;
    gallery_id: string;
  }>;
  return [
    ...userMissing.map((r) => ({
      userId: r.user_id,
      galleryId: r.gallery_id,
      missing: "user" as const,
    })),
    ...galleryMissing.map((r) => ({
      userId: r.user_id,
      galleryId: r.gallery_id,
      missing: "gallery" as const,
    })),
  ];
};
const updatePhoto = async (photoId: string, photo: PhotoInput) => {
  const { query, values } = SCHEMA.photo.buildUpdateByIdQuery(photo);
  if (!query || !values) return;
  db.prepare(query).run([...values, photoId]);
};
// Re-key a photo across photo + gallery_photo. The FK on gallery_photo
// is RESTRICT (no ON UPDATE CASCADE), so we toggle foreign_keys off
// for the duration of the transaction — SQLite requires this to be
// done outside any open transaction.
const renamePhoto = async (oldId: string, newId: string) => {
  db.pragma("foreign_keys = OFF");
  try {
    const tx = db.transaction(() => {
      db.prepare("UPDATE photo SET id = ? WHERE id = ?").run(newId, oldId);
      db.prepare("UPDATE gallery_photo SET photo_id = ? WHERE photo_id = ?").run(
        newId,
        oldId
      );
    });
    tx();
  } finally {
    db.pragma("foreign_keys = ON");
  }
};
const deletePhoto = async (photoId: string) =>
  deleteById(SCHEMA.photo, photoId);

// Geocoded fields for one (photo, lang) pair. English routes to the
// photo columns directly; everything else goes to photo_localized
// (upsert). `address` is stringified JSON; pass `null` to clear.
export interface GeocodedFields {
  countryCode?: string | null; // language-independent (photo column)
  stateCode?: string | null; // language-independent (photo column)
  city?: string | null;
  address?: string | null; // JSON
}
const upsertGeocoded = async (
  photoId: string,
  lang: string,
  fields: GeocodedFields
) => {
  if (lang === "en") {
    const updates: string[] = [];
    const values: unknown[] = [];
    const addField = (col: string, val: unknown) => {
      if (val === undefined) return;
      updates.push(`${col} = ?`);
      values.push(val);
    };
    addField("geocoded_country_code", fields.countryCode);
    addField("geocoded_state_code", fields.stateCode);
    addField("geocoded_city", fields.city);
    addField("geocoded_address", fields.address);
    if (updates.length === 0) return;
    db.prepare(
      `UPDATE photo SET ${updates.join(", ")} WHERE id = ?`
    ).run(...values, photoId);
    // Auto-fill operator country_code from the geocoded value when
    // the operator hasn't set one, so the country filter / Stats
    // pick up coordinate-derived photos uniformly.
    if (fields.countryCode) {
      db.prepare(
        "UPDATE photo SET country_code = ? WHERE id = ? AND (country_code IS NULL OR country_code = '')"
      ).run(fields.countryCode, photoId);
    }
    return;
  }
  // Per-lang validation drops values whose script doesn't match the
  // language (Nominatim's `?accept-language=<lang>` falls back to OSM
  // local labels when no localized form exists). Keeps the row + raw
  // address blob, only the city goes NULL.
  const city = acceptLocalizedCity(fields.city, lang)
    ? (fields.city ?? null)
    : null;
  db.prepare(
    `INSERT INTO photo_localized
       (photo_id, lang, geocoded_city, geocoded_address)
     VALUES (?, ?, ?, ?)
     ON CONFLICT (photo_id, lang) DO UPDATE SET
       geocoded_city    = COALESCE(excluded.geocoded_city, photo_localized.geocoded_city),
       geocoded_address = COALESCE(excluded.geocoded_address, photo_localized.geocoded_address)`
  ).run(photoId, lang, city, fields.address ?? null);
};

// Flag a photo as "Nominatim has no address for these coordinates" so
// subsequent intake / daemon runs skip it instead of retrying. Operator
// clears `geocode_no_data` back to 0 to force a fresh attempt.
const markGeocodeNoData = async (photoId: string): Promise<void> => {
  db.prepare("UPDATE photo SET geocode_no_data = 1 WHERE id = ?").run(photoId);
};

// Daemon's "give me work" query — photos with coords that are missing
// geocoded data for the requested language. Recent first by capture
// timestamp; rows with no timestamp (EXIF-less imports) go to the back
// so the visible / recently-shot photos get filled in earliest.
// Rows flagged `geocode_no_data` are skipped — Nominatim has no
// address for those coordinates and retrying would just spin.
const loadPhotosMissingGeocoded = async (
  lang: string,
  limit: number
): Promise<Array<{ id: string; lat: number; lon: number }>> => {
  const sql =
    lang === "en"
      ? `SELECT id, coord_lat, coord_lon FROM photo
           WHERE coord_lat IS NOT NULL AND coord_lon IS NOT NULL
             AND geocoded_city IS NULL
             AND geocode_no_data = 0
           ORDER BY taken IS NULL, taken DESC, id ASC
           LIMIT ?`
      : `SELECT p.id, p.coord_lat, p.coord_lon FROM photo p
           LEFT JOIN photo_localized pl
             ON pl.photo_id = p.id AND pl.lang = ?
           WHERE p.coord_lat IS NOT NULL AND p.coord_lon IS NOT NULL
             AND pl.photo_id IS NULL
             AND p.geocode_no_data = 0
           ORDER BY p.taken IS NULL, p.taken DESC, p.id ASC
           LIMIT ?`;
  const rows = (lang === "en"
    ? db.prepare(sql).all(limit)
    : db.prepare(sql).all(lang, limit)) as Array<{
    id: string;
    coord_lat: number;
    coord_lon: number;
  }>;
  return rows.map((r) => ({
    id: r.id,
    lat: r.coord_lat,
    lon: r.coord_lon,
  }));
};

const loadPhotoLocalized = async (
  lang: string
): Promise<Array<{ photo_id: string; geocoded_city: string | null }>> => {
  return db
    .prepare(
      "SELECT photo_id, geocoded_city FROM photo_localized WHERE lang = ?"
    )
    .all(lang) as Array<{ photo_id: string; geocoded_city: string | null }>;
};

const clearLocalizedCity = async (
  photoId: string,
  lang: string
): Promise<void> => {
  db.prepare(
    "UPDATE photo_localized SET geocoded_city = NULL WHERE photo_id = ? AND lang = ?"
  ).run(photoId, lang);
};
