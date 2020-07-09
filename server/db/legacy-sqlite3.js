const CONST = require("../constants");

const sqlite3 = require("sqlite3").verbose();

const COLUMNS = {
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

module.exports = (opts) => {
  if (!opts) {
    throw "The path to the SQLite3 database must be set to DB_OPTS.";
  }
  const db = new sqlite3.Database(opts);

  const loadUserAccessControl = () => {
    return new Promise((resolve) => {
      // No ACL implemented in the legacy Gallery, everyone has global view access.
      resolve({
        [CONST.SPECIAL_GALLERY_ALL]: CONST.ACCESS_VIEW,
      });
    });
  };
  const loadUser = () => {
    return new Promise((resolve, reject) => {
      reject(CONST.ERROR_NOT_IMPLEMENTED);
    });
  };
  const loadGalleries = () => {
    const columns = COLUMNS.gallery.join(",");
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
  const loadGallery = (galleryId) => {
    const column = COLUMNS.gallery.join(",");
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
  const loadGalleryPhotos = (galleryId) => {
    const getQuery = () => {
      const columns = COLUMNS.photo.join(",");
      const baseQuery = `SELECT ${columns} FROM photo`;
      switch (galleryId) {
        case CONST.SPECIAL_GALLERY_ALL:
          return (
            baseQuery +
            " JOIN photo_gallery ON photo.name=photo_gallery.photo_name"
          );
        case CONST.SPECIAL_GALLERY_NONE:
          return (
            baseQuery +
            " WHERE name NOT IN (SELECT photo_name FROM photo_gallery)"
          );
        default:
          return (
            baseQuery +
            " JOIN photo_gallery ON photo.name=photo_gallery.photo_name" +
            " WHERE photo_gallery.gallery_name = ?"
          );
      }
    };

    if (galleryId.startsWith(CONST.SPECIAL_GALLERY_PREFIX)) {
      return new Promise((resolve, reject) => {
        db.all(getQuery(), function (error, rows) {
          if (error) {
            return reject(error);
          }
          resolve(rows.map((row) => mapPhotoRow(row)));
        });
      });
    }
    return new Promise((resolve, reject) => {
      db.all(getQuery(), galleryId, function (error, rows) {
        if (error) {
          return reject(error);
        }
        resolve(rows.map((row) => mapPhotoRow(row)));
      });
    });
  };
  const loadGalleryPhoto = (galleryId, photoId) => {
    const getQuery = () => {
      const columns = COLUMNS.photo.join(",");
      const baseQuery = `SELECT ${columns} FROM photo`;
      switch (galleryId) {
        case CONST.SPECIAL_GALLERY_NONE:
          return (
            baseQuery +
            " WHERE name NOT IN (SELECT photo_name FROM photo_gallery)" +
            " AND name = ?"
          );
        default:
          return (
            baseQuery +
            " JOIN photo_gallery ON photo.name=photo_gallery.photo_name" +
            " WHERE photo_gallery.gallery_name = ?" +
            " AND name = ?"
          );
      }
    };

    if (galleryId === CONST.SPECIAL_GALLERY_ALL) {
      return new Promise((resolve, reject) => {
        // Without ACL this is not much different from global context
        loadPhoto(photoId)
          .then((photo) => resolve(photo))
          .catch((error) => reject(error));
      });
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
  const loadPhotos = () => {
    const query = "SELECT * FROM photo";
    return new Promise((resolve, reject) => {
      db.all(query, function (error, rows) {
        if (error) {
          return reject(error);
        }
        resolve(rows.map((row) => mapPhotoRow(row)));
      });
    });
  };
  const loadPhoto = (photoId) => {
    const query = "SELECT * FROM photo WHERE name = ?";
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

  return {
    loadUserAccessControl,
    loadUser,
    loadGalleries,
    loadGallery,
    loadGalleryPhotos,
    loadGalleryPhoto,
    loadPhotos,
    loadPhoto,
  };
};

const toString = (str) => {
  if (str !== null && str !== undefined) {
    return str.toString();
  }
  return "";
};
const calculateExposureTime = (shutterSpeed) => {
  const [n, d] = shutterSpeed.split("/");
  if (!d) {
    return n;
  }
  return Number(n) / Number(d);
};
const mapGalleryRow = (row) => {
  return {
    id: toString(row.name),
    title: toString(row.title),
    description: toString(row.description),
    epoch: toString(row.epoch),
  };
};
const mapPhotoRow = (row) => {
  const taken = new Date(toString(row.taken).substring(0, 19));
  const year = 0 + taken.getFullYear();
  const month = taken.getMonth() + 1;
  const day = taken.getDate();
  const hour = taken.getHours();
  const minute = taken.getMinutes();
  const second = taken.getSeconds();

  return {
    id: toString(row.name),
    title: toString(row.title),
    description: toString(row.description),
    taken: {
      timestamp: toString(row.taken),
      year: year,
      month: month,
      day: day,
      hour: hour,
      minute: minute,
      second: second,
      country: toString(row.country), // TODO: cleanup "unknown" to undefined
      place: toString(row.place),
      author: toString(row.author),
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
      focalLength: row.focal,
      aperture: toString(row.fstop),
      exposureTime: calculateExposureTime(row.shutter),
      iso: toString(row.iso),
    },
    size: {
      original: {
        width: toString(row.f_width),
        height: toString(row.f_height),
      },
      display: {
        width: toString(row.width),
        height: toString(row.height),
      },
      thumbnail: {
        width: toString(row.t_width),
        height: toString(row.t_height),
      },
    },
  };
};
