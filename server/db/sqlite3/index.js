import Database from "better-sqlite3";

import CONST from "../../lib/constants.js";
import config from "../../lib/config/index.js";
import logger from "../../lib/logger.js";

import schemaFactory from "./schema.js";

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

const loadAll = (schema) => {
  return db.prepare(schema.buildSelectQuery()).all().map(schema.mapRow);
};
const create = (schema, data) => {
  db.prepare(schema.buildCreateQuery()).run(schema.mapInsert(data));
};
const loadById = (schema, id) => {
  const row = db.prepare(schema.buildSelectByIdQuery()).get(id);
  if (!row) {
    throw CONST.ERROR_NOT_FOUND;
  }
  return schema.mapRow(row);
};
const updateById = (schema, id, data) => {
  const { query, values } = schema.buildUpdateByIdQuery(data);
  if (!query || !values) {
    return;
  }
  db.prepare(query).run([...values, id]);
};
const deleteById = (schema, id) => {
  db.prepare(schema.buildDeleteByIdQuery()).run([id]);
};

const loadMetas = async () => loadAll(SCHEMA.meta);
const createMeta = async (meta) => create(SCHEMA.meta, meta);
const loadMeta = async (key) => loadById(SCHEMA.meta, key);
const updateMeta = async (key, meta) => updateById(SCHEMA.meta, key, meta);
const deleteMeta = async (key) => deleteById(SCHEMA.meta, key);

const loadUsers = async () => loadAll(SCHEMA.user);
const createUser = async (user) => create(SCHEMA.user, user);
const loadUser = async (userId) => loadById(SCHEMA.user, userId);
const updateUser = async (userId, user) => updateById(SCHEMA.user, userId, user);
const deleteUser = async (userId) => deleteById(SCHEMA.user, userId);

const loadUserAccessControl = async (userId) => {
  const schema = SCHEMA.acl;
  // TODO: cache in memory
  const stmt = db.prepare(schema.buildSelectQuery(["user_id IN (?)"]));
  const userRows = stmt.all([userId]);
  const guestRows = stmt.all([":guest"]);
  return {
    ...Object.fromEntries(guestRows.map((row) => schema.mapRow(row))),
    ...Object.fromEntries(userRows.map((row) => schema.mapRow(row))),
  };
};

const loadGalleries = async () => loadAll(SCHEMA.gallery);
const createGallery = async (gallery) => create(SCHEMA.gallery, gallery);
const loadGallery = async (galleryId) => loadById(SCHEMA.gallery, galleryId);
const updateGallery = async (galleryId, gallery) =>
  updateById(SCHEMA.gallery, galleryId, gallery);
const deleteGallery = async (galleryId) => deleteById(SCHEMA.gallery, galleryId);

const loadGalleryPhotos = async (galleryId) => {
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
  const rows = galleryId.startsWith(CONST.SPECIAL_GALLERY_PREFIX)
    ? stmt.all()
    : stmt.all(galleryId);
  return rows.map(schema.mapRow);
};
const linkGalleryPhoto = async (galleryIds, photoIds) => {
  const stmt = db.prepare(SCHEMA.galleryPhoto.buildCreateQuery());
  const insertAll = db.transaction(() => {
    photoIds.forEach((photoId) => {
      galleryIds.forEach((galleryId) => {
        stmt.run(SCHEMA.galleryPhoto.mapInsert({ galleryId, photoId }));
      });
    });
  });
  insertAll();
};
const loadGalleryPhoto = async (galleryId, photoId) => {
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
  const rows = galleryId.startsWith(CONST.SPECIAL_GALLERY_PREFIX)
    ? stmt.all(photoId)
    : stmt.all(galleryId, photoId);
  if (rows.length === 0) {
    throw CONST.ERROR_NOT_FOUND;
  }
  return schema.mapRow(rows[0]);
};
const unlinkGalleryPhoto = async (galleryId, photoId) => {
  db.prepare(SCHEMA.galleryPhoto.buildDeleteByIdQuery()).run([galleryId, photoId]);
};
const unlinkAllPhotos = async (galleryId) => {
  db.prepare(SCHEMA.galleryPhoto.buildDeleteQuery(["gallery_id = ?"])).run([
    galleryId,
  ]);
};
const unlinkAllGalleries = async (photoId) => {
  db.prepare(SCHEMA.galleryPhoto.buildDeleteQuery(["photo_id = ?"])).run([
    photoId,
  ]);
};

const loadPhotos = async () => loadAll(SCHEMA.photo);
const createPhoto = async (photo) => create(SCHEMA.photo, photo);
const loadPhoto = async (photoId) => loadById(SCHEMA.photo, photoId);
const updatePhoto = async (photoId, photo) =>
  updateById(SCHEMA.photo, photoId, photo);
const deletePhoto = async (photoId) => deleteById(SCHEMA.photo, photoId);
