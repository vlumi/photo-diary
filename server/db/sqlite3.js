const sqlite3 = require("sqlite3").verbose();

const CONST = require("../utils/constants");
const config = require("../utils/config");
const logger = require("../utils/logger");

module.exports = () => {
  return {
    loadUserAccessControl,
    loadUsers,
    loadUser,
    loadGalleries,
    loadGallery,
    loadGalleryPhotos,
    loadGalleryPhoto,
    loadPhotos,
    loadPhoto,
  };
};

const SCHEMA = {
  gallery: ["id", "title", "description", "epoch", "theme"],
  photo: [
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
};

if (!config.DB_OPTS) {
  throw "The path to the SQLite3 database must be set to DB_OPTS.";
}
const db = new sqlite3.Database(config.DB_OPTS);
logger.debug("Connected to DB");

const loadUserAccessControl = async () => {
  // TODO: implement
  return {
    [CONST.SPECIAL_GALLERY_ALL]: CONST.ACCESS_VIEW,
  };
};
const loadUsers = async () => {
  // TODO: implement
  return [];
};
const loadUser = async () => {
  // TODO: implement
  throw CONST.NOT_FOUND;
};
const loadGalleries = async () => {
  const columns = SCHEMA.gallery.join(",");
  const query = `SELECT ${columns} FROM gallery`;
  return new Promise((resolve, reject) => {
    db.all(query, function (error, rows) {
      if (error) {
        return reject(error);
      }
      resolve(rows.map((row) => mapGalleryRow(row)));
    });
  });
};
const loadGallery = async (galleryId) => {
  const column = SCHEMA.gallery.join(",");
  const query = `SELECT ${column} FROM gallery WHERE id = ?`;
  return new Promise((resolve, reject) => {
    db.all(query, galleryId, function (error, rows) {
      if (error) {
        return reject(error);
      }
      if (rows.length !== 1) {
        return reject(CONST.ERROR_NOT_FOUND);
      }
      resolve(mapGalleryRow(rows[0]));
    });
  });
};
const loadGalleryPhotos = async (galleryId) => {
  const getQuery = () => {
    const columns = SCHEMA.photo.join(",");
    const baseQuery = `SELECT ${columns} FROM photo`;
    const order = " ORDER BY taken ASC, id ASC";
    switch (galleryId) {
      case CONST.SPECIAL_GALLERY_ALL:
        return baseQuery;
      case CONST.SPECIAL_GALLERY_PUBLIC:
        return (
          baseQuery +
          " WHERE id IN (SELECT photo_id FROM photo_gallery)" +
          order
        );
      case CONST.SPECIAL_GALLERY_PRIVATE:
        return (
          baseQuery +
          " WHERE id NOT IN (SELECT photo_id FROM photo_gallery)" +
          order
        );
      default:
        return (
          baseQuery +
          " JOIN photo_gallery ON photo.id=photo_gallery.photo_id" +
          " WHERE photo_gallery.gallery_id = ?" +
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
        resolve(rows.map((row, index) => mapPhotoRow(row, index)));
      });
    });
  }
  return new Promise((resolve, reject) => {
    db.all(getQuery(), galleryId, function (error, rows) {
      if (error) {
        return reject(error);
      }
      resolve(rows.map((row, index) => mapPhotoRow(row, index)));
    });
  });
};
const loadGalleryPhoto = async (galleryId, photoId) => {
  const getQuery = () => {
    const columns = SCHEMA.photo.join(",");
    const baseQuery = `SELECT ${columns} FROM photo`;
    const order = " ORDER BY taken ASC, id ASC";
    switch (galleryId) {
      case CONST.SPECIAL_GALLERY_PUBLIC:
        return (
          baseQuery +
          " WHERE id IN (SELECT photo_id FROM photo_gallery)" +
          " AND id = ?" +
          order
        );
      case CONST.SPECIAL_GALLERY_PRIVATE:
        return (
          baseQuery +
          " WHERE id NOT IN (SELECT photo_id FROM photo_gallery)" +
          " AND id = ?" +
          order
        );
      default:
        return (
          baseQuery +
          " JOIN photo_gallery ON photo.id=photo_gallery.photo_id" +
          " WHERE photo_gallery.gallery_id = ?" +
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
        const photos = rows.map((row) => mapPhotoRow(row));
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
      const photos = rows.map((row) => mapPhotoRow(row));
      if (photos.length === 0) {
        return reject(CONST.ERROR_NOT_FOUND);
      }
      resolve(photos[0]);
    });
  });
};
const loadPhotos = async () => {
  const columns = SCHEMA.photo.join(",");
  const query = `SELECT ${columns} FROM photo`;
  return new Promise((resolve, reject) => {
    db.all(query, function (error, rows) {
      if (error) {
        return reject(error);
      }
      resolve(rows.map((row) => mapPhotoRow(row)));
    });
  });
};
const loadPhoto = async (photoId) => {
  const columns = SCHEMA.photo.join(",");
  const query = `SELECT ${columns} FROM photo WHERE name = ?`;
  return new Promise((resolve, reject) => {
    db.all(query, photoId, function (error, rows) {
      if (error) {
        return reject(error);
      }
      if (rows.length !== 1) {
        return reject(CONST.ERROR_NOT_FOUND);
      }
      resolve(mapPhotoRow(rows[0]));
    });
  });
};

const toString = (str) => {
  if (str !== null && str !== undefined) {
    return str.toString();
  }
  return "";
};
const mapGalleryRow = (row) => {
  return {
    id: toString(row.id),
    title: toString(row.title),
    description: toString(row.description),
    epoch: toString(row.epoch).substring(0, 10),
    epochType: toString(row.epoch_type),
    theme: toString(row.theme),
  };
};
const mapPhotoRow = (row, index) => {
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
};
