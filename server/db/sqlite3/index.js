const sqlite3 = require("sqlite3").verbose();

const CONST = require("../../lib/constants");
const config = require("../../lib/config");
const logger = require("../../lib/logger");

const SCHEMA = require("./schema")();

module.exports = () => {
  return {
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
const db = new sqlite3.Database(config.DB_OPTS);
logger.debug("Connected to DB");

const loadAll = async (schema) => {
  const query = schema.buildSelectQuery();
  return new Promise((resolve, reject) => {
    db.all(query, (error, rows) => {
      if (error) {
        return reject(error);
      }
      resolve(rows.map(schema.mapRow));
    });
  });
};
const create = async (schema, data) => {
  const query = schema.buildCreateQuery();
  await db.serialize(() => {
    var stmt = db.prepare(query);
    stmt.run(schema.mapInsert(data));
    stmt.finalize();
  });
};
const loadById = async (schema, id) => {
  const query = schema.buildSelectByIdQuery();
  return new Promise((resolve, reject) => {
    db.all(query, id, (error, rows) => {
      if (error) {
        return reject(error);
      }
      if (rows.length !== 1) {
        return reject(CONST.ERROR_NOT_FOUND);
      }
      resolve(schema.mapRow(rows[0]));
    });
  });
};
const updateById = async (schema, id, data) => {
  const { query, values } = schema.buildUpdateByIdQuery(data);
  if (!query || !values) {
    return;
  }
  await db.serialize(() => {
    var stmt = db.prepare(query);
    stmt.run([...values, id]);
    stmt.finalize();
  });
};
const deleteById = async (schema, id) => {
  const query = schema.buildDeleteByIdQuery();
  await db.serialize(() => {
    var stmt = db.prepare(query);
    stmt.run([id]);
    stmt.finalize();
  });
};

const loadUsers = async () => {
  return await loadAll(SCHEMA.user);
};
const createUser = async (user) => {
  await create(SCHEMA.user, user);
};
const loadUser = async (userId) => {
  return await loadById(SCHEMA.user, userId);
};
const updateUser = async (userId, user) => {
  await updateById(SCHEMA.user, userId, user);
};
const deleteUser = async (userId) => {
  await deleteById(SCHEMA.user, userId);
};

const loadUserAccessControl = async (userId) => {
  const schema = SCHEMA.acl;
  // TODO: cache in memory
  const query = schema.buildSelectQuery(["user_id IN (?)"]);
  return await new Promise((resolve, reject) => {
    db.all(query, [userId], (error, rows) => {
      if (error) {
        return reject(CONST.ERROR_NOT_FOUND);
      }
      const mappedRows = Object.fromEntries(
        rows.map((row) => schema.mapRow(row))
      );
      db.all(query, [":guest"], (error, rows) => {
        if (!error) {
          const mappedGuestRows = Object.fromEntries(
            rows.map((row) => schema.mapRow(row))
          );
          resolve({
            ...mappedGuestRows,
            ...mappedRows,
          });
        } else {
          resolve(mappedRows);
        }
      });
    });
  });
};

const loadGalleries = async () => {
  return await loadAll(SCHEMA.gallery);
};
const createGallery = async (gallery) => {
  await create(SCHEMA.gallery, gallery);
};
const loadGallery = async (galleryId) => {
  return await loadById(SCHEMA.gallery, galleryId);
};
const updateGallery = async (galleryId, gallery) => {
  await updateById(SCHEMA.gallery, galleryId, gallery);
};
const deleteGallery = async (galleryId) => {
  await deleteById(SCHEMA.gallery, galleryId);
};

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

  if (galleryId.startsWith(CONST.SPECIAL_GALLERY_PREFIX)) {
    return new Promise((resolve, reject) => {
      db.all(getQuery(), function (error, rows) {
        if (error) {
          return reject(error);
        }
        resolve(rows.map(schema.mapRow));
      });
    });
  }
  return new Promise((resolve, reject) => {
    db.all(getQuery(), galleryId, function (error, rows) {
      if (error) {
        return reject(error);
      }
      resolve(rows.map(schema.mapRow));
    });
  });
};
const linkGalleryPhoto = async (galleryIds, photoIds) => {
  await db.serialize(() => {
    photoIds.forEach(async (photoId) => {
      galleryIds.forEach(async (galleryId) => {
        await create(SCHEMA.galleryPhoto, { galleryId, photoId });
      });
    });
  });
};
const loadGalleryPhoto = async (galleryId, photoId) => {
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

  if (galleryId === CONST.SPECIAL_GALLERY_ALL) {
    // TODO: fix
    return await loadPhoto(photoId);
  }
  if (galleryId.startsWith(CONST.SPECIAL_GALLERY_PREFIX)) {
    return new Promise((resolve, reject) => {
      db.all(getQuery(), photoId, function (error, rows) {
        if (error) {
          return reject(error);
        }
        const photos = rows.map(schema.mapRow);
        if (photos.length === 0) {
          return reject(CONST.ERROR_NOT_FOUND);
        }
        resolve(photos[0]);
      });
    });
  }
  return new Promise((resolve, reject) => {
    db.all(getQuery(), galleryId, photoId, function (error, rows) {
      if (error) {
        return reject(error);
      }
      const photos = rows.map(schema.mapRow);
      if (photos.length === 0) {
        return reject(CONST.ERROR_NOT_FOUND);
      }
      resolve(photos[0]);
    });
  });
};
const unlinkGalleryPhoto = async (galleryId, photoId) => {
  const query = SCHEMA.galleryPhoto.buildDeleteByIdQuery();
  await db.serialize(() => {
    var stmt = db.prepare(query);
    stmt.run([galleryId, photoId]);
    stmt.finalize();
  });
};
const unlinkAllPhotos = async (galleryId) => {
  const query = SCHEMA.galleryPhoto.buildDeleteQuery(["gallery_id = ?"]);
  await db.serialize(() => {
    var stmt = db.prepare(query);
    stmt.run([galleryId]);
    stmt.finalize();
  });
};
const unlinkAllGalleries = async (photoId) => {
  const query = SCHEMA.galleryPhoto.buildDeleteQuery(["photo_id = ?"]);
  await db.serialize(() => {
    var stmt = db.prepare(query);
    stmt.run([photoId]);
    stmt.finalize();
  });
};

const loadPhotos = async () => {
  return loadAll(SCHEMA.photo);
};
const createPhoto = async (photo) => {
  await create(SCHEMA.photo, photo);
};
const loadPhoto = async (photoId) => {
  return loadById(SCHEMA.photo, photoId);
};
const updatePhoto = async (photoId, photo) => {
  await updateById(SCHEMA.photo, photoId, photo);
};
const deletePhoto = async (photoId) => {
  await deleteById(SCHEMA.photo, photoId);
};
