import Database from "better-sqlite3";

import CONST from "../../lib/constants.js";
import { NotFoundError } from "../../lib/errors.js";
import config from "../../lib/config/index.js";
import logger from "../../lib/logger.js";
import { acceptLocalizedCity } from "../../lib/localized-script.js";
import {
  matchesDateRange,
  matchesFilter,
  type DateRange,
  type FilterShape,
} from "../../lib/photo-filter-eval.js";
import {
  buildAnnotations,
  buildCategoryValues,
} from "../../lib/stats-compute.js";
import { migrate } from "./migrate.js";

import schemaFactory, {
  buildLocalizedMap,
  type Gallery,
  type GalleryInput,
  type GalleryLocalizedRow,
  type GalleryPhoto,
  type GalleryRow,
  type Group,
  type GroupGalleryRow,
  type GroupRow,
  type MetaRow,
  type Photo,
  type PhotoInput,
  type PhotoLocalizedRow,
  type PhotoRow,
  type SavedFilter,
  type SavedFilterLocalizedRow,
  type SavedFilterRow,
  type SessionRow,
  type User,
  type UserGalleryRow,
  type UserRow,
  type VirtualGallerySourceRow,
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

    upsertVirtualGallery,
    deleteVirtualGallery,
    isVirtualGallery,
    isReferencedAsSource,

    loadSavedFilters,
    loadSavedFilter,
    createSavedFilter,
    updateSavedFilter,
    deleteSavedFilter,

    loadGalleryPhotos,
    queryFilteredPhotos,
    queryFilteredPhotosGlobal,
    queryFilteredPhotoCounts,
    queryFilteredPhotoNeighbors,
    queryGalleryFilterValues,
    queryGlobalFilterValues,
    linkGalleryPhoto,
    unlinkGalleryPhoto,
    unlinkAllPhotos,
    unlinkAllGalleries,
    loadAllGalleryPhotoLinks,
    loadGalleryPhoto,
    loadGalleryPhotoByOriginalFilename,

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
    clearGeocoded,
    loadPhotosMissingGeocoded,
    deletePhoto,
    loadPhotoLocalized,
    clearLocalizedCity,

    _resetForTests,
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

// Resolve access for (userId, galleryId):
//   1. user.is_admin = true                       → global admin (bypass).
//   2. MAX(is_editor) over matching positive rows from
//        user_gallery (user or :guest, this gallery)
//        group_gallery (any group the user belongs to, this gallery)
//      row present → view; is_editor=1 upgrades to gallery editor.
//   3. else                                       → deny.
const resolveAccessLevel = async (
  userId: string,
  galleryId: string
): Promise<{ hasAccess: boolean; isEditor: boolean }> => {
  const userRow = db
    .prepare("SELECT is_admin FROM user WHERE id = ?")
    .get(userId) as { is_admin: number } | undefined;
  if (userRow && userRow.is_admin) {
    return { hasAccess: true, isEditor: true };
  }
  // UNION ALL of the two row sources, then MAX. Sub-queries are cheap on
  // the small tables involved; explicit form reads better than a JOIN.
  const grantRow = db
    .prepare(
      `SELECT MAX(is_editor) AS is_editor FROM (
         SELECT is_editor FROM user_gallery
           WHERE user_id IN (?, ':guest') AND gallery_id = ?
         UNION ALL
         SELECT is_editor FROM group_gallery
           WHERE gallery_id = ?
             AND group_id IN (SELECT group_id FROM user_group WHERE user_id = ?)
       )`
    )
    .get(userId, galleryId, galleryId, userId) as
    | { is_editor: number | null }
    | undefined;
  if (grantRow?.is_editor === null || grantRow?.is_editor === undefined) {
    return { hasAccess: false, isEditor: false };
  }
  return { hasAccess: true, isEditor: !!grantRow.is_editor };
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
    is_editor?: boolean;
    hide_map?: number | null;
  }
): Promise<void> => {
  // Only touch the columns the caller passed (everything else is preserved on
  // conflict). Done with SQLite's INSERT ON CONFLICT DO UPDATE so a single
  // statement handles both the create and the partial-update path. When no
  // mutable columns were passed the conflict clause must be DO NOTHING —
  // SQLite rejects an empty DO UPDATE SET as a syntax error.
  const sets: string[] = [];
  if ("is_editor" in row) sets.push("is_editor = excluded.is_editor");
  if ("hide_map" in row) sets.push("hide_map = excluded.hide_map");
  const conflict =
    sets.length > 0
      ? `DO UPDATE SET ${sets.join(", ")}`
      : "DO NOTHING";
  const query =
    "INSERT INTO user_gallery (user_id, gallery_id, is_editor, hide_map) " +
    "VALUES (?, ?, ?, ?) " +
    `ON CONFLICT(user_id, gallery_id) ${conflict}`;
  db.prepare(query).run(
    row.user_id,
    row.gallery_id,
    row.is_editor ? 1 : 0,
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
  is_editor?: boolean;
  hide_map?: number | null;
}): Promise<void> => {
  // Mirror upsertUserGallery: DO NOTHING when no mutable columns were
  // passed, else DO UPDATE the supplied subset.
  const sets: string[] = [];
  if ("is_editor" in row) sets.push("is_editor = excluded.is_editor");
  if ("hide_map" in row) sets.push("hide_map = excluded.hide_map");
  const conflict =
    sets.length > 0
      ? `DO UPDATE SET ${sets.join(", ")}`
      : "DO NOTHING";
  const query =
    "INSERT INTO group_gallery (group_id, gallery_id, is_editor, hide_map) " +
    "VALUES (?, ?, ?, ?) " +
    `ON CONFLICT(group_id, gallery_id) ${conflict}`;
  db.prepare(query).run(
    row.group_id,
    row.gallery_id,
    row.is_editor ? 1 : 0,
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

// Virtual galleries: sibling `virtual_gallery_source` junction
// table holds one row per (virtual, source) pair, ordered by
// `ordinal` to preserve the operator's input order (#22). A
// gallery is virtual iff it has at least one row here. Loaders
// below decorate the base Gallery row with `sources` when present.
const loadAllVirtualGalleries = (): Map<string, string[]> => {
  const rows = db
    .prepare(
      "SELECT gallery_id, source_id, ordinal FROM virtual_gallery_source ORDER BY gallery_id, ordinal"
    )
    .all() as VirtualGallerySourceRow[];
  const out = new Map<string, string[]>();
  for (const row of rows) {
    const list = out.get(row.gallery_id);
    if (list) {
      list.push(row.source_id);
    } else {
      out.set(row.gallery_id, [row.source_id]);
    }
  }
  return out;
};
const loadVirtualGallerySources = (galleryId: string): string[] | undefined => {
  const rows = db
    .prepare(
      "SELECT source_id FROM virtual_gallery_source WHERE gallery_id = ? ORDER BY ordinal"
    )
    .all(galleryId) as Pick<VirtualGallerySourceRow, "source_id">[];
  if (rows.length === 0) return undefined;
  return rows.map((r) => r.source_id);
};
// Resolves a galleryId to the list of source gallery IDs whose
// `gallery_photo` rows make up its contents. Real gallery → [self].
// Virtual gallery → its stored sources. Empty sources or missing
// row treated as "no contents" (returns []).
const resolveGallerySources = (galleryId: string): string[] => {
  const sources = loadVirtualGallerySources(galleryId);
  return sources === undefined ? [galleryId] : sources;
};
const isVirtualGallery = async (galleryId: string): Promise<boolean> => {
  const row = db
    .prepare(
      "SELECT 1 FROM virtual_gallery_source WHERE gallery_id = ? LIMIT 1"
    )
    .get(galleryId);
  return row !== undefined;
};
// True iff some virtual gallery references this id as a source.
// Used to block "convert a real gallery to virtual" when it's
// already in another virtual's source list, preserving the
// "real galleries only as sources" invariant from #22's design
// decision #4.
const isReferencedAsSource = async (galleryId: string): Promise<boolean> => {
  const row = db
    .prepare(
      "SELECT 1 FROM virtual_gallery_source WHERE source_id = ? LIMIT 1"
    )
    .get(galleryId);
  return row !== undefined;
};
const decorateGalleryWithSources = (
  gallery: Gallery,
  sourcesByGallery: Map<string, string[]>
): Gallery => {
  const sources = sourcesByGallery.get(gallery.id);
  return sources === undefined ? gallery : { ...gallery, sources };
};
// Replace the source set atomically — DELETE existing rows then
// INSERT each in input order. better-sqlite3's `transaction(fn)`
// wraps the body in BEGIN/COMMIT.
const upsertVirtualGallery = async (
  galleryId: string,
  sources: string[]
): Promise<void> => {
  const del = db.prepare(
    "DELETE FROM virtual_gallery_source WHERE gallery_id = ?"
  );
  const ins = db.prepare(
    "INSERT INTO virtual_gallery_source (gallery_id, source_id, ordinal) VALUES (?, ?, ?)"
  );
  const replace = db.transaction((gid: string, list: string[]) => {
    del.run(gid);
    list.forEach((sourceId, i) => {
      ins.run(gid, sourceId, i);
    });
  });
  replace(galleryId, sources);
};
const deleteVirtualGallery = async (galleryId: string): Promise<void> => {
  db.prepare(
    "DELETE FROM virtual_gallery_source WHERE gallery_id = ?"
  ).run(galleryId);
};

// Saved filters / sub-galleries (#285). One row per (gallery, id)
// pair; `definition` is a JSON string holding the same `filter` +
// `dateRange` envelope the per-view endpoints already accept, so
// applying a saved filter is just unmarshalling and forwarding.
// Localized title / description live in `saved_filter_localized`,
// mirroring the gallery localization shape from #281.
const mapSavedFilterRow = (
  row: SavedFilterRow,
  localized?: SavedFilterLocalizedRow[]
): SavedFilter => ({
  id: row.id,
  galleryId: row.gallery_id,
  title: row.title,
  description: row.description,
  titleLocalized: buildLocalizedMap(localized, "title"),
  descriptionLocalized: buildLocalizedMap(localized, "description"),
  ordinal: row.ordinal,
  definition: (() => {
    try {
      return JSON.parse(row.definition) as Record<string, unknown>;
    } catch {
      return {};
    }
  })(),
});
const loadSavedFilterLocalizedFor = (
  galleryId: string,
  filterIds: string[]
): Map<string, SavedFilterLocalizedRow[]> => {
  if (filterIds.length === 0) return new Map();
  const placeholders = filterIds.map(() => "?").join(",");
  const rows = db
    .prepare(
      `SELECT gallery_id, filter_id, lang, title, description
       FROM saved_filter_localized
       WHERE gallery_id = ? AND filter_id IN (${placeholders})`
    )
    .all(galleryId, ...filterIds) as SavedFilterLocalizedRow[];
  const byId = new Map<string, SavedFilterLocalizedRow[]>();
  for (const r of rows) {
    const list = byId.get(r.filter_id);
    if (list) list.push(r);
    else byId.set(r.filter_id, [r]);
  }
  return byId;
};
const loadSavedFilters = async (galleryId: string): Promise<SavedFilter[]> => {
  // Sort by id ASC, matching the gallery list's ordering. The
  // dormant `ordinal` column stays for now (a follow-up drops it
  // and reworks the schema); operators pick id slugs they want to
  // sort by, no separate ordinal control needed.
  const rows = db
    .prepare(
      `SELECT id, gallery_id, title, description, definition, ordinal
       FROM saved_filter
       WHERE gallery_id = ?
       ORDER BY id ASC`
    )
    .all(galleryId) as SavedFilterRow[];
  const localized = loadSavedFilterLocalizedFor(
    galleryId,
    rows.map((r) => r.id)
  );
  return rows.map((row) => mapSavedFilterRow(row, localized.get(row.id)));
};
const loadSavedFilter = async (
  galleryId: string,
  id: string
): Promise<SavedFilter> => {
  const row = db
    .prepare(
      `SELECT id, gallery_id, title, description, definition, ordinal
       FROM saved_filter
       WHERE gallery_id = ? AND id = ?`
    )
    .get(galleryId, id) as SavedFilterRow | undefined;
  if (!row) throw new NotFoundError();
  const localized = db
    .prepare(
      `SELECT gallery_id, filter_id, lang, title, description
       FROM saved_filter_localized
       WHERE gallery_id = ? AND filter_id = ?`
    )
    .all(galleryId, id) as SavedFilterLocalizedRow[];
  return mapSavedFilterRow(row, localized);
};
// Per-language overlay upsert — same shape + semantics as the
// gallery / photo localized writers: missing key leaves the column
// alone; empty string clears it (sets NULL); both columns NULL
// keeps the row in place (harmless empty entry, GC'd by FK cascade
// on saved filter delete).
const upsertSavedFilterLocalized = (
  galleryId: string,
  filterId: string,
  lang: string,
  fields: { title?: string | null; description?: string | null }
): void => {
  const cols: string[] = [];
  const vals: unknown[] = [];
  if (fields.title !== undefined) {
    cols.push("title");
    vals.push(fields.title);
  }
  if (fields.description !== undefined) {
    cols.push("description");
    vals.push(fields.description);
  }
  if (cols.length === 0) return;
  const colList = cols.join(", ");
  const placeholders = cols.map(() => "?").join(", ");
  const updates = cols.map((c) => `${c} = excluded.${c}`).join(", ");
  db.prepare(
    `INSERT INTO saved_filter_localized (gallery_id, filter_id, lang, ${colList})
     VALUES (?, ?, ?, ${placeholders})
     ON CONFLICT (gallery_id, filter_id, lang) DO UPDATE SET ${updates}`
  ).run(galleryId, filterId, lang, ...vals);
};
const applyLocalizedPatch = (
  galleryId: string,
  filterId: string,
  titleMap?: Record<string, string | undefined>,
  descMap?: Record<string, string | undefined>
): void => {
  const perLang = new Map<
    string,
    { title?: string | null; description?: string | null }
  >();
  const merge = (
    map: Record<string, string | undefined> | undefined,
    field: "title" | "description"
  ) => {
    if (!map) return;
    for (const [lang, value] of Object.entries(map)) {
      if (value === undefined) continue;
      const entry = perLang.get(lang) ?? {};
      entry[field] = value === "" ? null : value;
      perLang.set(lang, entry);
    }
  };
  merge(titleMap, "title");
  merge(descMap, "description");
  for (const [lang, fields] of perLang) {
    upsertSavedFilterLocalized(galleryId, filterId, lang, fields);
  }
};
const createSavedFilter = async (
  filter: SavedFilter
): Promise<void> => {
  db.prepare(
    `INSERT INTO saved_filter (id, gallery_id, title, description, definition, ordinal)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(
    filter.id,
    filter.galleryId,
    filter.title,
    filter.description,
    JSON.stringify(filter.definition ?? {}),
    filter.ordinal
  );
  applyLocalizedPatch(
    filter.galleryId,
    filter.id,
    filter.titleLocalized,
    filter.descriptionLocalized
  );
};
const updateSavedFilter = async (
  galleryId: string,
  id: string,
  patch: Partial<
    Pick<SavedFilter, "title" | "description" | "definition" | "ordinal">
  > & {
    titleLocalized?: Record<string, string | undefined>;
    descriptionLocalized?: Record<string, string | undefined>;
  }
): Promise<void> => {
  const updates: string[] = [];
  const values: unknown[] = [];
  if ("title" in patch && patch.title !== undefined) {
    updates.push("title = ?");
    values.push(patch.title);
  }
  if ("description" in patch && patch.description !== undefined) {
    updates.push("description = ?");
    values.push(patch.description);
  }
  if ("definition" in patch && patch.definition !== undefined) {
    updates.push("definition = ?");
    values.push(JSON.stringify(patch.definition));
  }
  if ("ordinal" in patch && patch.ordinal !== undefined) {
    updates.push("ordinal = ?");
    values.push(patch.ordinal);
  }
  if (updates.length > 0) {
    db.prepare(
      `UPDATE saved_filter SET ${updates.join(", ")} WHERE gallery_id = ? AND id = ?`
    ).run(...values, galleryId, id);
  }
  applyLocalizedPatch(
    galleryId,
    id,
    patch.titleLocalized,
    patch.descriptionLocalized
  );
};
const deleteSavedFilter = async (
  galleryId: string,
  id: string
): Promise<void> => {
  db.prepare(
    "DELETE FROM saved_filter WHERE gallery_id = ? AND id = ?"
  ).run(galleryId, id);
};

const loadGalleries = async () => {
  const rows = db
    .prepare(SCHEMA.gallery.buildSelectQuery())
    .all() as GalleryRow[];
  const sourcesByGallery = loadAllVirtualGalleries();
  const localizedByGallery = loadGalleryLocalizedFor(rows.map((r) => r.id));
  return rows
    .map((row) => SCHEMA.gallery.mapRow(row, localizedByGallery.get(row.id)))
    .map((g) => decorateGalleryWithSources(g, sourcesByGallery));
};
const createGallery = async (gallery: Gallery) => {
  db.prepare(SCHEMA.gallery.buildCreateQuery()).run(
    SCHEMA.gallery.mapInsert(gallery)
  );
  // Localized overlay rows from the same payload — symmetrical with
  // updateGallery. CLI / API creates without overlay maps stay no-op.
  const perLang = new Map<string, { title?: string | null; description?: string | null }>();
  const merge = (
    map: Record<string, string | undefined> | undefined,
    field: "title" | "description"
  ) => {
    if (!map) return;
    for (const [lang, value] of Object.entries(map)) {
      if (value === undefined) continue;
      const entry = perLang.get(lang) ?? {};
      entry[field] = value === "" ? null : value;
      perLang.set(lang, entry);
    }
  };
  merge(gallery.titleLocalized, "title");
  merge(gallery.descriptionLocalized, "description");
  for (const [lang, fields] of perLang) {
    upsertGalleryLocalizedFields(gallery.id, lang, fields);
  }
};
const loadGallery = async (galleryId: string) => {
  const row = db
    .prepare(SCHEMA.gallery.buildSelectByIdQuery())
    .get(galleryId) as GalleryRow | undefined;
  if (!row) throw new NotFoundError();
  const localizedRows = db
    .prepare("SELECT * FROM gallery_localized WHERE gallery_id = ?")
    .all(galleryId) as GalleryLocalizedRow[];
  const base = SCHEMA.gallery.mapRow(row, localizedRows);
  const sources = loadVirtualGallerySources(galleryId);
  return sources === undefined ? base : { ...base, sources };
};
const updateGallery = async (galleryId: string, gallery: GalleryInput) => {
  const { query, values } = SCHEMA.gallery.buildUpdateByIdQuery(gallery);
  if (query && values) {
    db.prepare(query).run([...values, galleryId]);
  }
  // Per-language overlays for title / description. Same semantics
  // as the photo path: empty string clears, missing lang leaves the
  // existing column.
  const perLang = new Map<string, { title?: string | null; description?: string | null }>();
  const merge = (
    map: Record<string, string | undefined> | undefined,
    field: "title" | "description"
  ) => {
    if (!map) return;
    for (const [lang, value] of Object.entries(map)) {
      if (value === undefined) continue;
      const entry = perLang.get(lang) ?? {};
      entry[field] = value === "" ? null : value;
      perLang.set(lang, entry);
    }
  };
  merge(gallery.titleLocalized, "title");
  merge(gallery.descriptionLocalized, "description");
  for (const [lang, fields] of perLang) {
    upsertGalleryLocalizedFields(galleryId, lang, fields);
  }
};
const upsertGalleryLocalizedFields = (
  galleryId: string,
  lang: string,
  fields: { title?: string | null; description?: string | null }
): void => {
  const cols: string[] = [];
  const vals: unknown[] = [];
  if (fields.title !== undefined) {
    cols.push("title");
    vals.push(fields.title);
  }
  if (fields.description !== undefined) {
    cols.push("description");
    vals.push(fields.description);
  }
  if (cols.length === 0) return;
  const colList = cols.join(", ");
  const placeholders = cols.map(() => "?").join(", ");
  const updates = cols.map((c) => `${c} = excluded.${c}`).join(", ");
  db.prepare(
    `INSERT INTO gallery_localized (gallery_id, lang, ${colList})
     VALUES (?, ?, ${placeholders})
     ON CONFLICT (gallery_id, lang) DO UPDATE SET ${updates}`
  ).run(galleryId, lang, ...vals);
};
const deleteGallery = async (galleryId: string) =>
  deleteById(SCHEMA.gallery, galleryId);

const loadGalleryPhotos = async (galleryId: string, lang?: string) => {
  const schema = SCHEMA.photo;
  const sources = resolveGallerySources(galleryId);
  if (sources.length === 0) return [];
  // Virtual galleries (#22) widen the gallery_id check from `= ?`
  // to `IN (?, ?, …)`. Real galleries resolve to `[galleryId]`,
  // producing the same single-id IN-clause — equivalent to the
  // previous `gallery_id = ?` behaviour. DEDUPLICATION is already
  // implicit in the photo `id IN (...)` outer membership: each
  // photo row appears at most once in the result.
  const placeholders = sources.map(() => "?").join(", ");
  const stmt = db.prepare(
    schema.buildSelectQuery([
      `id IN (SELECT photo_id FROM gallery_photo WHERE gallery_id IN (${placeholders}))`,
    ])
  );
  const rows = stmt.all(...sources) as PhotoRow[];
  const localized = loadLocalizedFor(rows.map((r) => r.id));
  return rows.map((row, index) =>
    schema.mapRow(row, index, localized.get(row.id), lang)
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
const loadAllGalleryPhotoLinks = async (): Promise<
  Array<{ galleryId: string; photoId: string }>
> => {
  const rows = db
    .prepare("SELECT gallery_id, photo_id FROM gallery_photo")
    .all() as Array<{ gallery_id: string; photo_id: string }>;
  return rows.map((r) => ({ galleryId: r.gallery_id, photoId: r.photo_id }));
};
interface QueryFilteredOpts {
  filter?: FilterShape;
  dateRange?: DateRange;
  year?: number;
  month?: number;
  day?: number;
  lang?: string;
}
const matchesScope = (
  photo: Photo,
  year?: number,
  month?: number,
  day?: number
): boolean => {
  const instant = photo.taken.instant;
  if (year !== undefined && instant.year !== year) return false;
  if (month !== undefined && instant.month !== month) return false;
  if (day !== undefined && instant.day !== day) return false;
  return true;
};
// Load the gallery's photos via the same SQL path as
// `loadGalleryPhotos`, then evaluate FilterShape + (year, month,
// day) scope in JS. For SQLite the round-trip is free, so load-all-
// and-filter is the right shape; the boundary moves here so the
// model layer doesn't have to know which is which. A Postgres
// driver can replace this body with a parameterised WHERE.
const queryFilteredPhotos = async (
  galleryId: string,
  opts: QueryFilteredOpts = {}
): Promise<Photo[]> => {
  const photos = (await loadGalleryPhotos(galleryId, opts.lang)) as Photo[];
  return photos.filter(
    (photo) =>
      matchesScope(photo, opts.year, opts.month, opts.day) &&
      matchesDateRange(opts.dateRange, photo) &&
      matchesFilter(opts.filter, photo)
  );
};
// Cross-gallery counterpart of `queryFilteredPhotos`. Loads every
// photo (no gallery scope) and applies the same FilterShape /
// optional year/month/day predicate. Drives the GlobalStats Location
// map's filter-aware photo set without needing to fan out per-gallery
// queries.
const queryFilteredPhotosGlobal = async (
  opts: QueryFilteredOpts = {}
): Promise<Photo[]> => {
  const photos = (await loadPhotos(opts.lang)) as Photo[];
  return photos.filter(
    (photo) =>
      matchesScope(photo, opts.year, opts.month, opts.day) &&
      matchesDateRange(opts.dateRange, photo) &&
      matchesFilter(opts.filter, photo)
  );
};

interface CountsFilteredOpts {
  filter?: FilterShape;
  dateRange?: DateRange;
  year?: number;
}
const queryFilteredPhotoCounts = async (
  galleryId: string,
  opts: CountsFilteredOpts = {}
): Promise<Record<string, number>> => {
  const photos = (await loadGalleryPhotos(galleryId)) as Photo[];
  const out: Record<string, number> = {};
  for (const photo of photos) {
    const instant = photo.taken.instant;
    if (opts.year !== undefined && instant.year !== opts.year) continue;
    if (!matchesDateRange(opts.dateRange, photo)) continue;
    if (!matchesFilter(opts.filter, photo)) continue;
    const key = `${instant.year}-${String(instant.month).padStart(
      2,
      "0"
    )}-${String(instant.day).padStart(2, "0")}`;
    out[key] = (out[key] ?? 0) + 1;
  }
  return out;
};

interface NeighborsFilteredOpts {
  filter?: FilterShape;
  dateRange?: DateRange;
  lang?: string;
}
interface NeighborsResult {
  previous?: Photo;
  next?: Photo;
  first?: Photo;
  last?: Photo;
  position?: number;
  total: number;
}
const queryFilteredPhotoNeighbors = async (
  galleryId: string,
  photoId: string,
  opts: NeighborsFilteredOpts = {}
): Promise<NeighborsResult> => {
  const all = (await loadGalleryPhotos(galleryId, opts.lang)) as Photo[];
  const filtered = all
    .filter(
      (p) => matchesDateRange(opts.dateRange, p) && matchesFilter(opts.filter, p)
    )
    .sort((a, b) =>
      a.taken.instant.timestamp.localeCompare(b.taken.instant.timestamp)
    );
  if (filtered.length === 0) return { total: 0 };
  const first = filtered[0];
  const last = filtered[filtered.length - 1];
  const index = filtered.findIndex((p) => p.id === photoId);
  if (index < 0) {
    // Current photo not in filtered set — first / last still
    // useful; previous / next undefined; position omitted.
    return { first, last, total: filtered.length };
  }
  const previous = index > 0 ? filtered[index - 1] : undefined;
  const next = index < filtered.length - 1 ? filtered[index + 1] : undefined;
  return {
    previous,
    next,
    first,
    last,
    position: index + 1,
    total: filtered.length,
  };
};

// Filter pill universe + city localized-label map for a gallery
// (#534). Loads the gallery's photos and projects per-category
// distinct values via the shared `buildCategoryValues`, then maps
// stats's camelCase category names to the kebab-case shape the
// FilterShape wire format + the client filter UI both use. Adds
// the two categories `buildByCategory` doesn't bucket but the
// pills want — `year-month` (derived from photo instants) and
// `geotagged` (constant yes/no so the pill stays selectable).
interface FilterValuesResult {
  categoryValues: Record<string, string[]>;
  byCityLocalized: Record<string, string>;
}
// Shared projection from the photo set into the kebab-case
// FilterShape universe. Used by both the gallery-scoped
// `queryGalleryFilterValues` (#534) and the global cross-gallery
// flavour (followup to #532). Photos array is already filtered to
// the appropriate scope by the caller.
const buildFilterValuesFromPhotos = (photos: Photo[]): FilterValuesResult => {
  const cv = buildCategoryValues(photos);
  const annotations = buildAnnotations(photos);
  const yearMonthSet = new Set<string>();
  for (const p of photos) {
    const i = p.taken.instant;
    yearMonthSet.add(`${i.year}-${String(i.month).padStart(2, "0")}`);
  }
  const yearMonths = [...yearMonthSet].sort();
  return {
    categoryValues: {
      author: cv.author ?? [],
      country: cv.country ?? [],
      state: cv.state ?? [],
      city: cv.city ?? [],
      geotagged: ["yes", "no"],
      year: cv.year ?? [],
      "year-month": yearMonths,
      month: cv.month ?? [],
      weekday: cv.weekday ?? [],
      hour: cv.hour ?? [],
      "camera-make": cv.cameraMake ?? [],
      camera: cv.camera ?? [],
      lens: cv.lens ?? [],
      "camera-lens": cv.cameraLens ?? [],
      "focal-length": cv.focalLength ?? [],
      "focal-length-eq": cv.focalLength35mmEquiv ?? [],
      aperture: cv.aperture ?? [],
      "exposure-time": cv.exposureTime ?? [],
      iso: cv.iso ?? [],
      ev: cv.ev ?? [],
      lv: cv.lv ?? [],
      resolution: cv.resolution ?? [],
      orientation: cv.orientation ?? [],
      "aspect-ratio": cv.aspectRatio ?? [],
    },
    byCityLocalized: annotations.byCityLocalized,
  };
};
const queryGalleryFilterValues = async (
  galleryId: string,
  lang?: string
): Promise<FilterValuesResult> => {
  const photos = (await loadGalleryPhotos(galleryId, lang)) as Photo[];
  return buildFilterValuesFromPhotos(photos);
};
const queryGlobalFilterValues = async (
  lang?: string
): Promise<FilterValuesResult> => {
  const photos = (await loadPhotos(lang)) as Photo[];
  return buildFilterValuesFromPhotos(photos);
};

const loadGalleryPhoto = async (
  galleryId: string,
  photoId: string,
  lang?: string
) => {
  const schema = SCHEMA.photo;
  const sources = resolveGallerySources(galleryId);
  if (sources.length === 0) throw new NotFoundError();
  // Virtual gallery aware (#22): widen membership check to the
  // resolved source set. Same SQL shape — IN (?, ?, …) instead of
  // = ?. The photo `id` predicate still pins to a single row.
  const placeholders = sources.map(() => "?").join(", ");
  const stmt = db.prepare(
    schema.buildSelectQuery([
      `id IN (SELECT photo_id FROM gallery_photo WHERE gallery_id IN (${placeholders}))`,
      "id = ?",
    ])
  );
  const rows = stmt.all(...sources, photoId) as PhotoRow[];
  if (rows.length === 0) {
    throw new NotFoundError();
  }
  const localizedRows = db
    .prepare("SELECT * FROM photo_localized WHERE photo_id = ?")
    .all(photoId) as PhotoLocalizedRow[];
  return schema.mapRow(rows[0], 0, localizedRows, lang);
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

// Load every photo_localized row for the requested ids, grouped by
// photo_id. mapRow consumes the array to (a) build the per-field
// `titleLocalized` / `descriptionLocalized` / `placeLocalized` maps
// for operator-set fields and (b) pick the EN-canonical overlay for
// `geocoded.city` when a `lang` argument is also passed. Returns an
// empty Map for empty input; photos without any localized rows are
// simply absent from the result.
const loadLocalizedFor = (
  photoIds: string[]
): Map<string, PhotoLocalizedRow[]> => {
  if (photoIds.length === 0) return new Map();
  const placeholders = photoIds.map(() => "?").join(",");
  const rows = db
    .prepare(
      `SELECT * FROM photo_localized WHERE photo_id IN (${placeholders})`
    )
    .all(...photoIds) as PhotoLocalizedRow[];
  const byId = new Map<string, PhotoLocalizedRow[]>();
  for (const r of rows) {
    const list = byId.get(r.photo_id);
    if (list) list.push(r);
    else byId.set(r.photo_id, [r]);
  }
  return byId;
};
// Gallery analogue — gallery_localized rows grouped by gallery_id.
// Returns empty Map for empty input; galleries without overlays are
// absent from the result. mapRow surfaces the `titleLocalized` and
// `descriptionLocalized` maps from the array.
const loadGalleryLocalizedFor = (
  galleryIds: string[]
): Map<string, GalleryLocalizedRow[]> => {
  if (galleryIds.length === 0) return new Map();
  const placeholders = galleryIds.map(() => "?").join(",");
  const rows = db
    .prepare(
      `SELECT * FROM gallery_localized WHERE gallery_id IN (${placeholders})`
    )
    .all(...galleryIds) as GalleryLocalizedRow[];
  const byId = new Map<string, GalleryLocalizedRow[]>();
  for (const r of rows) {
    const list = byId.get(r.gallery_id);
    if (list) list.push(r);
    else byId.set(r.gallery_id, [r]);
  }
  return byId;
};

const loadPhotos = async (lang?: string) => {
  const rows = db.prepare(SCHEMA.photo.buildSelectQuery()).all() as PhotoRow[];
  const localized = loadLocalizedFor(rows.map((r) => r.id));
  return rows.map((row, index) =>
    SCHEMA.photo.mapRow(row, index, localized.get(row.id), lang)
  );
};
const createPhoto = async (photo: PhotoInput) => {
  db.prepare(SCHEMA.photo.buildCreateQuery()).run(
    SCHEMA.photo.mapInsert(photo)
  );
  // Process localized overlays from the same payload — symmetrical
  // with updatePhoto. Most creates (converter intake) don't include
  // these, so the loop is a no-op there.
  const photoId = photo.id;
  if (!photoId) return;
  const perLang = collectPhotoLocalizedPatch(photo);
  for (const [lang, fields] of perLang) {
    upsertPhotoLocalizedFields(photoId, lang, fields);
  }
};
const loadPhoto = async (photoId: string, lang?: string) => {
  const row = db.prepare(SCHEMA.photo.buildSelectByIdQuery()).get(photoId) as
    | PhotoRow
    | undefined;
  if (!row) throw new NotFoundError();
  const localizedRows = db
    .prepare("SELECT * FROM photo_localized WHERE photo_id = ?")
    .all(photoId) as PhotoLocalizedRow[];
  return SCHEMA.photo.mapRow(row, 0, localizedRows, lang);
};
// Filename matching is case-insensitive: cameras vary on extension
// case (Fuji writes `.JPG`, others `.jpg`), and operator-generated
// JSON sidecars often normalize to lowercase. A case-sensitive `=`
// match meant the sidecar would miss its existing row and create a
// phantom photo with the lowercase-id form alongside the real
// uppercase-original_filename row.
const loadPhotosByOriginalFilename = async (originalFilename: string) => {
  const rows = db
    .prepare(
      SCHEMA.photo.buildSelectQuery(["original_filename = ? COLLATE NOCASE"])
    )
    .all(originalFilename) as PhotoRow[];
  return rows.map((row, index) => SCHEMA.photo.mapRow(row, index));
};
// Gallery-scoped lookup by camera filename — drives the Photo
// modal's fallback when the URL's id doesn't resolve to a real
// photo. Returns the first row (operator's archive can in
// principle have collisions; the modal lands on whichever the DB
// returns first, and the caller redirects to its canonical URL).
const loadGalleryPhotoByOriginalFilename = async (
  galleryId: string,
  originalFilename: string,
  lang?: string
) => {
  const schema = SCHEMA.photo;
  const sources = resolveGallerySources(galleryId);
  if (sources.length === 0) throw new NotFoundError();
  const placeholders = sources.map(() => "?").join(", ");
  const stmt = db.prepare(
    schema.buildSelectQuery([
      `id IN (SELECT photo_id FROM gallery_photo WHERE gallery_id IN (${placeholders}))`,
      "original_filename = ? COLLATE NOCASE",
    ])
  );
  const rows = stmt.all(...sources, originalFilename) as PhotoRow[];
  if (rows.length === 0) {
    throw new NotFoundError();
  }
  const localizedRows = db
    .prepare("SELECT * FROM photo_localized WHERE photo_id = ?")
    .all(rows[0].id) as PhotoLocalizedRow[];
  return schema.mapRow(rows[0], 0, localizedRows, lang);
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
// user_gallery rows whose referenced user or gallery is gone.
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
        "WHERE gallery_id NOT IN (SELECT id FROM gallery) " +
        "ORDER BY user_id ASC, gallery_id ASC"
    )
    .all() as Array<{
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
  if (query && values) {
    db.prepare(query).run([...values, photoId]);
  }
  // Per-language overlays for operator-set fields. Each map is
  // {lang: value}; empty string clears that column (NULL in DB);
  // omitting a lang leaves the existing column unchanged; an empty
  // map is a no-op. Mixed cols per row — title may exist in `ja`
  // while description does not, and the row carries the column the
  // request touched.
  const perLang = collectPhotoLocalizedPatch(photo);
  for (const [lang, fields] of perLang) {
    upsertPhotoLocalizedFields(photoId, lang, fields);
  }
};
const collectPhotoLocalizedPatch = (
  photo: PhotoInput
): Map<string, { title?: string | null; description?: string | null; place?: string | null }> => {
  const byLang = new Map<string, { title?: string | null; description?: string | null; place?: string | null }>();
  const merge = (
    map: Record<string, string | undefined> | undefined,
    field: "title" | "description" | "place"
  ) => {
    if (!map) return;
    for (const [lang, value] of Object.entries(map)) {
      if (value === undefined) continue;
      const entry = byLang.get(lang) ?? {};
      entry[field] = value === "" ? null : value;
      byLang.set(lang, entry);
    }
  };
  merge(photo.titleLocalized, "title");
  merge(photo.descriptionLocalized, "description");
  merge(photo.taken?.location?.placeLocalized, "place");
  return byLang;
};
const upsertPhotoLocalizedFields = (
  photoId: string,
  lang: string,
  fields: { title?: string | null; description?: string | null; place?: string | null }
): void => {
  const cols: string[] = [];
  const vals: unknown[] = [];
  if (fields.title !== undefined) {
    cols.push("title");
    vals.push(fields.title);
  }
  if (fields.description !== undefined) {
    cols.push("description");
    vals.push(fields.description);
  }
  if (fields.place !== undefined) {
    cols.push("place");
    vals.push(fields.place);
  }
  if (cols.length === 0) return;
  const colList = cols.join(", ");
  const placeholders = cols.map(() => "?").join(", ");
  const updates = cols.map((c) => `${c} = excluded.${c}`).join(", ");
  db.prepare(
    `INSERT INTO photo_localized (photo_id, lang, ${colList})
     VALUES (?, ?, ${placeholders})
     ON CONFLICT (photo_id, lang) DO UPDATE SET ${updates}`
  ).run(photoId, lang, ...vals);
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

// Reset every geocode-derived column to NULL so the admin coord-edit
// flow can hand off to the converter without leaving stale values
// visible in the meantime. `geocode_no_data` resets to 0 so the next
// intake / daemon run will retry instead of skipping. The per-language
// rows in `photo_localized` lose their `geocoded_city` too (FK CASCADE
// would drop the row entirely, which we don't want — the
// `geocoded_address` raw blob stays for audit / re-localize, only the
// derived city goes NULL).
const clearGeocoded = async (photoId: string): Promise<void> => {
  db.prepare(
    `UPDATE photo SET
       geocoded_country_code = NULL,
       geocoded_state_code   = NULL,
       geocoded_city         = NULL,
       geocoded_address      = NULL,
       geocode_no_data       = 0
     WHERE id = ?`
  ).run(photoId);
  db.prepare(
    "UPDATE photo_localized SET geocoded_city = NULL WHERE photo_id = ?"
  ).run(photoId);
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

// Test-only seam. The :memory: connection persists for the life of
// the vitest worker (migrations already applied at module load), so
// rather than dropping + remigrating between tests we DELETE rows
// in FK-safe order and let the next `beforeEach` reseed. `:guest`
// stays — migration 015 seeds it idempotently and the access cascade
// depends on the row existing.
const _resetForTests = (): void => {
  db.exec(`
    DELETE FROM photo_localized;
    DELETE FROM gallery_photo;
    DELETE FROM user_gallery;
    DELETE FROM group_gallery;
    DELETE FROM user_group;
    DELETE FROM session;
    DELETE FROM photo;
    DELETE FROM gallery;
    DELETE FROM "group";
    DELETE FROM user WHERE id != ':guest';
    DELETE FROM meta WHERE key != 'schema_version';
  `);
};
