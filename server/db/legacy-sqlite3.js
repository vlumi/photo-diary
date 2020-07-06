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
  return {
    loadGalleries: (onSuccess, onError) => {
      const columns = COLUMNS.gallery.join(",");
      const query = `SELECT ${columns} FROM gallery`;
      db.all(query, function (error, rows) {
        if (error) {
          onError(error);
        } else {
          onSuccess(rows.map((row) => mapGalleryRow(row)));
        }
      });
    },
    loadGallery: (galleryId, onSuccess, onError) => {
      const column = COLUMNS.gallery.join(",");
      const query = `SELECT ${column} FROM gallery WHERE name = ?`;
      db.all(query, galleryId, function (error, rows) {
        if (error) {
          onError(error);
        } else {
          if (rows.length != 1) {
            onError(CONST.ERROR_NOT_FOUND);
          } else {
            onSuccess(mapGalleryRow(rows[0]));
          }
        }
      });
    },
    loadGalleryPhotos: (galleryId, onSuccess, onError) => {
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
        db.all(getQuery(), function (error, rows) {
          if (error) {
            onError(error);
          } else {
            onSuccess(rows.map((row) => mapPhotoRow(row)));
          }
        });
      } else {
        db.all(getQuery(), galleryId, function (error, rows) {
          if (error) {
            onError(error);
          } else {
            onSuccess(rows.map((row) => mapPhotoRow(row)));
          }
        });
      }
    },
    loadPhotos: (onSuccess, onError) => {
      const query = "SELECT * FROM photo";
      db.all(query, function (error, rows) {
        if (error) {
          onError(error);
        } else {
          onSuccess(rows.map((row) => mapPhotoRow(row)));
        }
      });
    },
    loadPhoto: (photoId, onSuccess, onError) => {
      const query = "SELECT * FROM photo WHERE name = ?";
      db.all(query, photoId, function (error, rows) {
        if (error) {
          onError(error);
        } else if (rows.length != 1) {
          onError(CONST.ERROR_NOT_FOUND);
        } else {
          onSuccess(mapPhotoRow(rows[0]));
        }
      });
    },
  };
};

const toString = (str) => {
  if (str !== null && str !== undefined) {
    return str.toString();
  }
  return "";
};
const mapGalleryRow = (row) => {
  // console.log(row);
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
      country: toString(row.country),
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
      focalLength: toString(row.focal),
      // focalLength35mmEquiv: 41,
      aperture: toString(row.fstop),
      shutterSpeed: toString(row.shutter),
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
