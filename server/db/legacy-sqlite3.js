const sqlite3 = require("sqlite3").verbose();

const CONST = require("../utils/constants");
const config = require("../utils/config");
const logger = require("../utils/logger");

module.exports = () => {
  return {
    loadUsers,
    createUser,
    updateUser,
    loadUser,

    loadUserAccessControl,

    loadGalleries,
    loadGallery,

    loadGalleryPhotos,
    loadGalleryPhoto,

    loadPhotos,
    loadPhoto,
  };
};

const SCHEMA = {
  gallery: ["name", "title", "description", "epoch"],
  photo: [
    "name",
    "title",
    "taken",
    "country",
    "author",
    "camera",
    "width",
    "height",
    "t_width",
    "t_height",
    "description",
    "place",
    "focal",
    "fstop",
    "shutter",
    "iso",
    "f_width",
    "f_height",
  ],
};

if (!config.DB_OPTS) {
  throw "The path to the SQLite3 database must be set to DB_OPTS.";
}
const db = new sqlite3.Database(config.DB_OPTS);
logger.debug("Connected to DB");

const loadUserAccessControl = async () => {
  // No ACL implemented in the legacy Gallery, everyone has global view access.
  return {
    [CONST.SPECIAL_GALLERY_ALL]: CONST.ACCESS_VIEW,
  };
};
const loadUsers = async () => {
  return [];
};
const createUser = async () => {
  throw CONST.ERROR_NOT_IMPLEMENTED;
};
const updateUser = async () => {
  throw CONST.ERROR_NOT_IMPLEMENTED;
};
const loadUser = async () => {
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
  const query = `SELECT ${column} FROM gallery WHERE name = ?`;
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
    const order = " ORDER BY taken ASC, name ASC";
    switch (galleryId) {
      case CONST.SPECIAL_GALLERY_ALL:
        return baseQuery;
      case CONST.SPECIAL_GALLERY_PUBLIC:
        return (
          baseQuery +
          " WHERE name IN (SELECT photo_name FROM photo_gallery)" +
          order
        );
      case CONST.SPECIAL_GALLERY_PRIVATE:
        return (
          baseQuery +
          " WHERE name NOT IN (SELECT photo_name FROM photo_gallery)" +
          order
        );
      default:
        return (
          baseQuery +
          " JOIN photo_gallery ON photo.name=photo_gallery.photo_name" +
          " WHERE photo_gallery.gallery_name = ?" +
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
    const order = " ORDER BY taken ASC, name ASC";
    switch (galleryId) {
      case CONST.SPECIAL_GALLERY_PUBLIC:
        return (
          baseQuery +
          " WHERE name IN (SELECT photo_name FROM photo_gallery)" +
          " AND name = ?" +
          order
        );
      case CONST.SPECIAL_GALLERY_PRIVATE:
        return (
          baseQuery +
          " WHERE name NOT IN (SELECT photo_name FROM photo_gallery)" +
          " AND name = ?" +
          order
        );
      default:
        return (
          baseQuery +
          " JOIN photo_gallery ON photo.name=photo_gallery.photo_name" +
          " WHERE photo_gallery.gallery_name = ?" +
          " AND name = ?" +
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
    id: toString(row.name),
    title: toString(row.title),
    description: toString(row.description),
    epoch: toString(row.epoch).substring(0, 10),
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

  const calculateExposureTime = (shutterSpeed) => {
    const [n, d] = shutterSpeed.split("/");
    if (!d) {
      return Number(n);
    }
    return Number(n) / Number(d);
  };
  const normalizeCountry = (country) =>
    !country || country === "unknown" ? undefined : country;

  return {
    id: toString(row.name),
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
        country: normalizeCountry(row.country),
        place: toString(row.place),
        coordinates: {
          latitude: undefined,
          longitude: undefined,
          altitude: undefined,
        },
      },
    },
    camera: {
      make: undefined,
      model: toString(row.camera),
      serial: undefined,
    },
    lens: {
      make: undefined,
      model: undefined,
      serial: undefined,
    },
    exposure: {
      focalLength: Number(row.focal),
      aperture: Number(row.fstop),
      exposureTime: calculateExposureTime(row.shutter),
      iso: Number(row.iso),
    },
    dimensions: {
      original: {
        width: Number(row.f_width),
        height: Number(row.f_height),
      },
      display: {
        width: Number(row.width),
        height: Number(row.height),
      },
      thumbnail: {
        width: Number(row.t_width),
        height: Number(row.t_height),
      },
    },
  };
};
