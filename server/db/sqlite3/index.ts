/* eslint-disable @typescript-eslint/no-explicit-any */
import Database from "better-sqlite3";

import CONST from "../../lib/constants.js";
import config from "../../lib/config/index.js";
import logger from "../../lib/logger.js";

import schemaFactory from "./schema.js";

type Row = Record<string, any>;

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

type SchemaEntry = ReturnType<typeof schemaFactory>[keyof ReturnType<typeof schemaFactory>];

const loadAll = (schema: SchemaEntry) => {
  return (db.prepare(schema.buildSelectQuery()).all() as Row[]).map(
    schema.mapRow as (row: Row) => Row
  );
};
const create = (schema: SchemaEntry, data: Row) => {
  db.prepare(schema.buildCreateQuery()).run(schema.mapInsert(data) as never[]);
};
const loadById = (schema: SchemaEntry, id: string) => {
  const row = db.prepare(schema.buildSelectByIdQuery()).get(id) as
    | Row
    | undefined;
  if (!row) {
    throw CONST.ERROR_NOT_FOUND;
  }
  return (schema.mapRow as (row: Row) => Row)(row);
};
const updateById = (schema: SchemaEntry, id: string, data: Row) => {
  const { query, values } = schema.buildUpdateByIdQuery(data);
  if (!query || !values) {
    return;
  }
  db.prepare(query).run([...values, id]);
};
const deleteById = (schema: SchemaEntry, id: string) => {
  db.prepare(schema.buildDeleteByIdQuery()).run([id]);
};

const loadMetas = async () => loadAll(SCHEMA.meta);
const createMeta = async (meta: Row) => create(SCHEMA.meta, meta);
const loadMeta = async (key: string) => loadById(SCHEMA.meta, key);
const updateMeta = async (key: string, meta: Row) =>
  updateById(SCHEMA.meta, key, meta);
const deleteMeta = async (key: string) => deleteById(SCHEMA.meta, key);

const loadUsers = async () => loadAll(SCHEMA.user);
const createUser = async (user: Row) => create(SCHEMA.user, user);
const loadUser = async (userId: string) => loadById(SCHEMA.user, userId);
const updateUser = async (userId: string, user: Row) =>
  updateById(SCHEMA.user, userId, user);
const deleteUser = async (userId: string) => deleteById(SCHEMA.user, userId);

const loadUserAccessControl = async (userId: string) => {
  const schema = SCHEMA.acl;
  // TODO: cache in memory
  const stmt = db.prepare(schema.buildSelectQuery(["user_id IN (?)"]));
  const userRows = stmt.all([userId]) as Row[];
  const guestRows = stmt.all([":guest"]) as Row[];
  return {
    ...Object.fromEntries(guestRows.map((row) => schema.mapRow(row))),
    ...Object.fromEntries(userRows.map((row) => schema.mapRow(row))),
  };
};

const loadGalleries = async () => loadAll(SCHEMA.gallery);
const createGallery = async (gallery: Row) => create(SCHEMA.gallery, gallery);
const loadGallery = async (galleryId: string) =>
  loadById(SCHEMA.gallery, galleryId);
const updateGallery = async (galleryId: string, gallery: Row) =>
  updateById(SCHEMA.gallery, galleryId, gallery);
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
    : stmt.all(galleryId)) as Row[];
  return rows.map((row, index) => schema.mapRow(row, index));
};
const linkGalleryPhoto = async (galleryIds: string[], photoIds: string[]) => {
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
    : stmt.all(galleryId, photoId)) as Row[];
  if (rows.length === 0) {
    throw CONST.ERROR_NOT_FOUND;
  }
  return schema.mapRow(rows[0], 0);
};
const unlinkGalleryPhoto = async (galleryId: string, photoId: string) => {
  db.prepare(SCHEMA.galleryPhoto.buildDeleteByIdQuery()).run([galleryId, photoId]);
};
const unlinkAllPhotos = async (galleryId: string) => {
  db.prepare(SCHEMA.galleryPhoto.buildDeleteQuery(["gallery_id = ?"])).run([
    galleryId,
  ]);
};
const unlinkAllGalleries = async (photoId: string) => {
  db.prepare(SCHEMA.galleryPhoto.buildDeleteQuery(["photo_id = ?"])).run([
    photoId,
  ]);
};

const loadPhotos = async () => loadAll(SCHEMA.photo);
const createPhoto = async (photo: Row) => create(SCHEMA.photo, photo);
const loadPhoto = async (photoId: string) => loadById(SCHEMA.photo, photoId);
const updatePhoto = async (photoId: string, photo: Row) =>
  updateById(SCHEMA.photo, photoId, photo);
const deletePhoto = async (photoId: string) => deleteById(SCHEMA.photo, photoId);
