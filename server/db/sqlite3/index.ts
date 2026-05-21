import Database from "better-sqlite3";

import CONST from "../../lib/constants.js";
import config from "../../lib/config/index.js";
import logger from "../../lib/logger.js";
import { migrate } from "./migrate.js";

import schemaFactory, {
  type Gallery,
  type GalleryInput,
  type GalleryPhoto,
  type GalleryRow,
  type MetaRow,
  type PhotoInput,
  type PhotoRow,
  type User,
  type UserGalleryRow,
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

    loadUserAccessControl,
    resolveHideMap,

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
    updatePhoto,
    deletePhoto,
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
  if (!row) throw CONST.ERROR_NOT_FOUND;
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
  if (!row) throw CONST.ERROR_NOT_FOUND;
  return SCHEMA.user.mapRow(row);
};
const updateUser = async (userId: string, user: Partial<User>) => {
  const { query, values } = SCHEMA.user.buildUpdateByIdQuery(user);
  if (!query || !values) return;
  db.prepare(query).run([...values, userId]);
};
const deleteUser = async (userId: string) => deleteById(SCHEMA.user, userId);

const loadUserAccessControl = async (
  userId: string
): Promise<Record<string, number>> => {
  const schema = SCHEMA.userGallery;
  // TODO: cache in memory
  const stmt = db.prepare(schema.buildSelectQuery(["user_id IN (?)"]));
  const userRows = stmt.all([userId]) as UserGalleryRow[];
  const guestRows = stmt.all([":guest"]) as UserGalleryRow[];
  return {
    ...Object.fromEntries(guestRows.map(schema.mapRow)),
    ...Object.fromEntries(userRows.map(schema.mapRow)),
  };
};
// Resolve the privacy cascade for (userId, galleryId) in one query. Returns
// the most specific `user_gallery` row's `hide_map` (1, 0, or null) considering
// the four-cell hierarchy: (user, gallery) > (':guest', gallery) >
// (user, ':all') > (':guest', ':all'). Rows with null `hide_map` are skipped
// so a less-specific row's non-null value can win. Returns undefined when
// no row at any level has a non-null `hide_map`.
const resolveHideMap = async (
  userId: string,
  galleryId: string
): Promise<number | undefined> => {
  const row = db
    .prepare(
      `SELECT hide_map FROM user_gallery
       WHERE (user_id = ? OR user_id = ':guest')
         AND (gallery_id = ? OR gallery_id = ':all')
         AND hide_map IS NOT NULL
       ORDER BY
         CASE WHEN user_id = ? THEN 0 ELSE 1 END,
         CASE WHEN gallery_id = ? THEN 0 ELSE 1 END
       LIMIT 1`
    )
    .get(userId, galleryId, userId, galleryId) as
    | { hide_map: number }
    | undefined;
  return row?.hide_map;
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
  if (!row) throw CONST.ERROR_NOT_FOUND;
  return SCHEMA.gallery.mapRow(row);
};
const updateGallery = async (galleryId: string, gallery: GalleryInput) => {
  const { query, values } = SCHEMA.gallery.buildUpdateByIdQuery(gallery);
  if (!query || !values) return;
  db.prepare(query).run([...values, galleryId]);
};
const deleteGallery = async (galleryId: string) =>
  deleteById(SCHEMA.gallery, galleryId);

const loadGalleryPhotos = async (galleryId: string) => {
  const schema = SCHEMA.photo;
  const getQuery = () => {
    switch (galleryId) {
      case CONST.SPECIAL_GALLERY_ALL:
        return schema.buildSelectQuery();
      case CONST.SPECIAL_GALLERY_PUBLIC:
        return schema.buildSelectQuery([
          "id IN (SELECT photo_id FROM gallery_photo)",
        ]);
      case CONST.SPECIAL_GALLERY_PRIVATE:
        return schema.buildSelectQuery([
          "id NOT IN (SELECT photo_id FROM gallery_photo)",
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
  return rows.map((row, index) => schema.mapRow(row, index));
};
const linkGalleryPhoto = async (
  galleryIds: string[],
  photoIds: string[]
) => {
  const stmt = db.prepare(SCHEMA.galleryPhoto.buildCreateQuery());
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
const loadGalleryPhoto = async (galleryId: string, photoId: string) => {
  if (galleryId === CONST.SPECIAL_GALLERY_ALL) {
    // TODO: fix
    return loadPhoto(photoId);
  }
  const schema = SCHEMA.photo;
  const getQuery = () => {
    switch (galleryId) {
      case CONST.SPECIAL_GALLERY_PUBLIC:
        return schema.buildSelectQuery([
          "id IN (SELECT photo_id FROM gallery_photo)",
          "AND id = ?",
        ]);
      case CONST.SPECIAL_GALLERY_PRIVATE:
        return schema.buildSelectQuery([
          "id NOT IN (SELECT photo_id FROM gallery_photo)",
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
    throw CONST.ERROR_NOT_FOUND;
  }
  return schema.mapRow(rows[0], 0);
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

const loadPhotos = async () => {
  const rows = db.prepare(SCHEMA.photo.buildSelectQuery()).all() as PhotoRow[];
  return rows.map((row, index) => SCHEMA.photo.mapRow(row, index));
};
const createPhoto = async (photo: PhotoInput) => {
  db.prepare(SCHEMA.photo.buildCreateQuery()).run(
    SCHEMA.photo.mapInsert(photo)
  );
};
const loadPhoto = async (photoId: string) => {
  const row = db.prepare(SCHEMA.photo.buildSelectByIdQuery()).get(photoId) as
    | PhotoRow
    | undefined;
  if (!row) throw CONST.ERROR_NOT_FOUND;
  return SCHEMA.photo.mapRow(row, 0);
};
const updatePhoto = async (photoId: string, photo: PhotoInput) => {
  const { query, values } = SCHEMA.photo.buildUpdateByIdQuery(photo);
  if (!query || !values) return;
  db.prepare(query).run([...values, photoId]);
};
const deletePhoto = async (photoId: string) =>
  deleteById(SCHEMA.photo, photoId);
