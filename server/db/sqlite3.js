const sqlite3 = require("sqlite3").verbose();

const CONST = require("../utils/constants");
const config = require("../utils/config");
const logger = require("../utils/logger");

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

const SCHEMA = {
  user: {
    table: "user",
    columns: ["id", "password", "secret"],
    order: ["id ASC"],
    mapRow: (row) => {
      return {
        id: toString(row.id),
        password: toString(row.password),
        secret: toString(row.secret),
      };
    },
    mapToColumns: (user) => {
      return {
        password: user.password,
        secret: user.secret,
      };
    },
    mapInsert: (user) => [user.id, user.password, user.secret],
  },
  acl: {
    table: "acl",
    columns: ["user_id", "gallery_id", "level"],
    order: ["user_id ASC", "gallery_id ASC"],
    mapRow: (row) => {
      return [row.gallery_id, row.level];
    },
  },
  gallery: {
    table: "gallery",
    columns: [
      "id",
      "title",
      "description",
      "epoch",
      "epoch_type",
      "theme",
      "initial_view",
      "hostname",
    ],
    order: ["id ASC"],
    mapRow: (row) => {
      return {
        id: toString(row.id),
        title: toString(row.title),
        description: toString(row.description),
        epoch: toString(row.epoch).substring(0, 10),
        epochType: toString(row.epoch_type),
        theme: toString(row.theme),
        initialView: toString(row.initial_view),
        hostname: toString(row.hostname),
      };
    },
    mapToColumns: (gallery) => {
      return {
        title: gallery.title,
        description: gallery.description,
        epoch: gallery.epoch,
        epoch_type: gallery.epochType,
        theme: gallery.theme,
        initial_view: gallery.initialView,
        hostname: gallery.hostname,
      };
    },
    mapInsert: (gallery) => {
      return [
        gallery.id,
        gallery.title,
        gallery.description,
        gallery.epoch,
        gallery.epochType,
        gallery.theme,
        gallery.initialView,
        gallery.hostname,
      ];
    },
  },
  galleryPhoto: {
    table: "gallery_photo",
    columns: ["gallery_id", "photo_id"],
    mapInsert: (galleryPhoto) => {
      return [galleryPhoto.galleryId, galleryPhoto.photoId];
    },
  },
  photo: {
    table: "photo",
    columns: [
      "id",
      "title",
      "description",
      "author",

      "taken",
      "country_code",
      "place",
      "coord_lat",
      "coord_lon",
      "coord_alt",

      "camera_make",
      "camera_model",
      "camera_serial",
      "lens_make",
      "lens_model",
      "lens_serial",

      "focal",
      "fstop",
      "exposure_time",
      "iso",

      "orig_width",
      "orig_height",
      "disp_width",
      "disp_height",
      "thumb_width",
      "thumb_height",
    ],
    order: ["taken ASC", "id ASC"],
    mapRow: (row, index) => {
      const taken = new Date(toString(row.taken).substring(0, 19));
      const year = 0 + taken.getFullYear();
      const month = taken.getMonth() + 1;
      const day = taken.getDate();
      const hour = taken.getHours();
      const minute = taken.getMinutes();
      const second = taken.getSeconds();

      const normalizeCountry = (country) =>
        !country || country === "unknown" ? undefined : country;

      return {
        id: toString(row.id),
        index: index,
        title: toString(row.title),
        description: toString(row.description),
        taken: {
          instant: {
            timestamp: toString(row.taken),
            year: year,
            month: month,
            day: day,
            hour: hour,
            minute: minute,
            second: second,
          },
          author: toString(row.author),
          location: {
            country: normalizeCountry(row.country_code),
            place: toString(row.place),
            coordinates: {
              latitude: row.coord_lat,
              longitude: row.coord_lon,
              altitude: row.coord_alt,
            },
          },
        },
        camera: {
          make: toString(row.camera_make),
          model: toString(row.camera_model),
          serial: toString(row.camera_serial),
        },
        lens: {
          make: toString(row.lens_make),
          model: toString(row.lens_model),
          serial: toString(row.lens_serial),
        },
        exposure: {
          focalLength: Number(row.focal),
          aperture: Number(row.fstop),
          exposureTime: Number(row.exposure_time),
          iso: Number(row.iso),
        },
        dimensions: {
          original: {
            width: Number(row.orig_width),
            height: Number(row.orig_height),
          },
          display: {
            width: Number(row.disp_width),
            height: Number(row.disp_height),
          },
          thumbnail: {
            width: Number(row.thumb_width),
            height: Number(row.thumb_height),
          },
        },
      };
    },
    mapToColumns: (photo) => {
      const result = {};
      if ("title" in photo) result.title = photo.title;
      if ("description" in photo) result.description = photo.description;
      if ("taken" in photo) {
        const taken = photo.taken;
        if ("author" in taken) result.author = taken.author;
        if ("instant" in taken) {
          const instant = taken.instant;
          if ("timestamp" in instant) result.taken = instant.timestamp;
        }
        if ("location" in taken) {
          const location = taken.location;
          if ("country" in location) result.country_code = location.country;
          if ("place" in location) result.place = location.place;
          if ("coordinates" in location) {
            const coordinates = location.coordinates;
            if ("latitude" in coordinates)
              result.coord_lat = coordinates.latitude;
            if ("longitude" in coordinates)
              result.coord_lon = coordinates.longitude;
            if ("altitude" in coordinates)
              result.coord_alt = coordinates.altitude;
          }
        }
      }
      if ("camera" in photo) {
        const camera = photo.camera;
        if ("make" in camera) result.camera_make = camera.make;
        if ("model" in camera) result.camera_model = camera.model;
        if ("serial" in camera) result.camera_serial = camera.serial;
      }
      if ("lens" in photo) {
        const lens = photo.lens;
        if ("make" in lens) result.lens_make = lens.make;
        if ("model" in lens) result.lens_model = lens.model;
        if ("serial" in lens) result.lens_serial = lens.serial;
      }
      if ("exposure" in photo) {
        const exposure = photo.exposure;
        if ("focalLength" in exposure) result.focal = exposure.focalLength;
        if ("aperture" in exposure) result.fstop = exposure.aperture;
        if ("exposureTime" in exposure)
          result.exposure_time = exposure.exposureTime;
        if ("iso" in exposure) result.iso = exposure.iso;
      }
      if ("dimensions" in photo) {
        const dimensions = photo.dimensions;
        if ("original" in dimensions) {
          const original = dimensions.original;
          if ("width" in original) result.orig_width = original.width;
          if ("height" in original) result.orig_height = original.height;
        }
        if ("display" in dimensions) {
          const display = dimensions.display;
          if ("width" in display) result.disp_width = display.width;
          if ("height" in display) result.disp_height = display.height;
        }
        if ("thumbnail" in dimensions) {
          const thumbnail = dimensions.thumbnail;
          if ("width" in thumbnail) result.thumb_width = thumbnail.width;
          if ("height" in thumbnail) result.thumb_height = thumbnail.height;
        }
      }
      return result;
    },
    mapInsert: (photo) => {
      const map = SCHEMA.photo.mapToColumns(photo);
      return [
        photo.id,
        map.title,
        map.description,
        map.author,

        map.taken,
        map.country_code,
        map.place,
        map.coord_lat,
        map.coord_lon,
        map.coord_alt,

        map.camera_make,
        map.camera_model,
        map.camera_serial,
        map.lens_make,
        map.lens_model,
        map.lens_serial,

        map.focal,
        map.fstop,
        map.exposure_time,
        map.iso,

        map.orig_width,
        map.orig_height,
        map.disp_width,
        map.disp_height,
        map.thumb_width,
        map.thumb_height,
      ];
    },
  },
};
const baseSelect = (schema) => {
  const columns = schema.columns.join(",");
  return `SELECT ${columns} FROM ${schema.table}`;
};
const loadAll = async (schema) => {
  const query = baseSelect(schema) + ` ORDER BY ${schema.order}`;
  return new Promise((resolve, reject) => {
    db.all(query, (error, rows) => {
      if (error) {
        return reject(error);
      }
      resolve(rows.map((row) => schema.mapRow(row)));
    });
  });
};
const create = async (schema, data) => {
  const columns = schema.columns;
  const placeholders = columns.map(() => "?").join(",");
  const query = `INSERT INTO ${schema.table} (${columns}) VALUES (${placeholders})`;
  await db.serialize(() => {
    var stmt = db.prepare(query);
    stmt.run(schema.mapInsert(data));
    stmt.finalize();
  });
};
const loadById = async (schema, id, idField = "id", allowEmpty = false) => {
  const query = baseSelect(schema) + ` WHERE ${idField} = ?`;
  return new Promise((resolve, reject) => {
    db.all(query, id, (error, rows) => {
      if (error) {
        return reject(error);
      }
      if (rows.length !== 1 && !allowEmpty) {
        return reject(CONST.ERROR_NOT_FOUND);
      }
      resolve(schema.mapRow(rows[0]));
    });
  });
};
const updateById = async (schema, id, data) => {
  const columnData = schema.mapToColumns(data);
  const cleanData = Object.fromEntries(
    schema.columns
      .filter((column) => column in columnData)
      .map((column) => [column, columnData[column]])
  );
  const columns = Object.keys(cleanData);
  const placeholders = columns.map((column) => `${column}=?`).join(", ");
  const values = columns.map((column) => cleanData[column]);
  const query = `UPDATE ${schema.table} SET ${placeholders} WHERE id=?`;
  await db.serialize(() => {
    var stmt = db.prepare(query);
    stmt.run([...values, id]);
    stmt.finalize();
  });
};
const deleteById = async (schema, id) => {
  const query = `DELETE FROM ${schema.table}  WHERE id=?`;
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
  // TODO: cache in memory
  const query = baseSelect(SCHEMA.acl) + " WHERE user_id IN (?)";
  return await new Promise((resolve, reject) => {
    db.all(query, userId, (error, rows) => {
      if (error) {
        return reject(CONST.ERROR_NOT_FOUND);
      }
      if (rows.length < 1) {
        return reject(CONST.ERROR_NOT_FOUND);
      }
      const mappedRows = rows.map((row) => SCHEMA.acl.mapRow(row));
      resolve(Object.fromEntries(mappedRows));
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
  const getQuery = () => {
    const order = " ORDER BY taken ASC, id ASC";
    switch (galleryId) {
      case CONST.SPECIAL_GALLERY_ALL:
        return baseSelect(SCHEMA.photo);
      case CONST.SPECIAL_GALLERY_PUBLIC:
        return (
          baseSelect(SCHEMA.photo) +
          " WHERE id IN (SELECT photo_id FROM gallery_photo)" +
          order
        );
      case CONST.SPECIAL_GALLERY_PRIVATE:
        return (
          baseSelect(SCHEMA.photo) +
          " WHERE id NOT IN (SELECT photo_id FROM gallery_photo)" +
          order
        );
      default:
        return (
          baseSelect(SCHEMA.photo) +
          " JOIN gallery_photo ON photo.id=gallery_photo.photo_id" +
          " WHERE gallery_photo.gallery_id = ?" +
          order
        );
    }
  };

  if (galleryId.startsWith(CONST.SPECIAL_GALLERY_PREFIX)) {
    return new Promise((resolve, reject) => {
      db.all(getQuery(), function (error, rows) {
        if (error) {
          return reject(error);
        }
        resolve(rows.map((row, index) => SCHEMA.photo.mapRow(row, index)));
      });
    });
  }
  return new Promise((resolve, reject) => {
    db.all(getQuery(), galleryId, function (error, rows) {
      if (error) {
        return reject(error);
      }
      resolve(rows.map((row, index) => SCHEMA.photo.mapRow(row, index)));
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
  const getQuery = () => {
    const order = " ORDER BY taken ASC, id ASC";
    switch (galleryId) {
      case CONST.SPECIAL_GALLERY_PUBLIC:
        return (
          baseSelect(SCHEMA.photo) +
          " WHERE id IN (SELECT photo_id FROM gallery_photo)" +
          " AND id = ?" +
          order
        );
      case CONST.SPECIAL_GALLERY_PRIVATE:
        return (
          baseSelect(SCHEMA.photo) +
          " WHERE id NOT IN (SELECT photo_id FROM gallery_photo)" +
          " AND id = ?" +
          order
        );
      default:
        return (
          baseSelect(SCHEMA.photo) +
          " JOIN gallery_photo ON photo.id=gallery_photo.photo_id" +
          " WHERE gallery_photo.gallery_id = ?" +
          " AND id = ?" +
          order
        );
    }
  };

  if (galleryId === CONST.SPECIAL_GALLERY_ALL) {
    // Without ACL this is no different from global context
    return await loadPhoto(photoId);
  }
  if (galleryId.startsWith(CONST.SPECIAL_GALLERY_PREFIX)) {
    return new Promise((resolve, reject) => {
      db.all(getQuery(), photoId, function (error, rows) {
        if (error) {
          return reject(error);
        }
        const photos = rows.map((row) => SCHEMA.photo.mapRow(row));
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
      const photos = rows.map((row) => SCHEMA.photo.mapRow(row));
      if (photos.length === 0) {
        return reject(CONST.ERROR_NOT_FOUND);
      }
      resolve(photos[0]);
    });
  });
};
const unlinkGalleryPhoto = async (galleryId, photoId) => {
  const query = `DELETE FROM ${SCHEMA.galleryPhoto.table} WHERE gallery_id = ? AND photo_id = ?`;
  await db.serialize(() => {
    var stmt = db.prepare(query);
    stmt.run([galleryId, photoId]);
    stmt.finalize();
  });
};
const unlinkAllPhotos = async (galleryId) => {
  const query = `DELETE FROM ${SCHEMA.galleryPhoto.table} WHERE gallery_id = ?`;
  await db.serialize(() => {
    var stmt = db.prepare(query);
    stmt.run([galleryId]);
    stmt.finalize();
  });
};
const unlinkAllGalleries = async (photoId) => {
  const query = `DELETE FROM ${SCHEMA.galleryPhoto.table} WHERE photo_id = ?`;
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

const toString = (str) => {
  if (str !== null && str !== undefined) {
    return str.toString();
  }
  return "";
};
