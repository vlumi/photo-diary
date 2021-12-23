const CONST = require("../../lib/constants");

module.exports = () => {
  return {
    meta: {
      mapRow: (row) => {
        return {
          [toString(row.key)]: toString(row.value),
        };
      },
      mapInsert: (meta) => [meta.key, meta.value],

      buildCreateQuery: () => buildCreateQuery(SCHEMA.meta),
      buildSelectByIdQuery: () => buildSelectByIdQuery(SCHEMA.meta),
      buildUpdateByIdQuery: (data) => buildUpdateByIdQuery(SCHEMA.meta, data),
      buildDeleteByIdQuery: () => buildDeleteByIdQuery(SCHEMA.meta),

      buildSelectQuery: (conditions) =>
        buildSelectQuery(SCHEMA.meta, conditions),
      buildDeleteQuery: (conditions) =>
        buildDeleteQuery(SCHEMA.meta, conditions),
    },
    user: {
      mapRow: (row) => {
        return {
          id: toString(row.id),
          password: toString(row.password),
          secret: toString(row.secret),
        };
      },
      mapInsert: (user) => [user.id, user.password, user.secret],

      buildCreateQuery: () => buildCreateQuery(SCHEMA.user),
      buildSelectByIdQuery: () => buildSelectByIdQuery(SCHEMA.user),
      buildUpdateByIdQuery: (data) => buildUpdateByIdQuery(SCHEMA.user, data),
      buildDeleteByIdQuery: () => buildDeleteByIdQuery(SCHEMA.user),

      buildSelectQuery: (conditions) =>
        buildSelectQuery(SCHEMA.user, conditions),
      buildDeleteQuery: (conditions) =>
        buildDeleteQuery(SCHEMA.user, conditions),
    },
    acl: {
      mapRow: (row) => {
        return [row.gallery_id, row.level];
      },
      mapInsert: () => {
        throw CONST.ERROR_NOT_IMPLEMENTED;
      },
      buildCreateQuery: () => buildCreateQuery(SCHEMA.acl),
      buildSelectByIdQuery: () => buildSelectByIdQuery(SCHEMA.acl),
      buildUpdateByIdQuery: (data) => buildUpdateByIdQuery(SCHEMA.acl, data),
      buildDeleteByIdQuery: () => buildDeleteByIdQuery(SCHEMA.acl),

      buildSelectQuery: (conditions) =>
        buildSelectQuery(SCHEMA.acl, conditions),
      buildDeleteQuery: (conditions) =>
        buildDeleteQuery(SCHEMA.acl, conditions),
    },
    gallery: {
      mapRow: (row) => {
        return {
          id: toString(row.id),
          title: toString(row.title),
          description: toString(row.description),
          icon: toString(row.icon),
          epoch: toString(row.epoch).substring(0, 10),
          epochType: toString(row.epoch_type),
          theme: toString(row.theme),
          initialView: toString(row.initial_view),
          hostname: toString(row.hostname),
        };
      },
      mapInsert: (gallery) => {
        return [
          gallery.id,
          gallery.title,
          gallery.description,
          gallery.icon,
          gallery.epoch,
          gallery.epochType,
          gallery.theme,
          gallery.initialView,
          gallery.hostname,
        ];
      },

      buildCreateQuery: () => buildCreateQuery(SCHEMA.gallery),
      buildSelectByIdQuery: () => buildSelectByIdQuery(SCHEMA.gallery),
      buildUpdateByIdQuery: (data) =>
        buildUpdateByIdQuery(SCHEMA.gallery, data),
      buildDeleteByIdQuery: () => buildDeleteByIdQuery(SCHEMA.gallery),

      buildSelectQuery: (conditions) =>
        buildSelectQuery(SCHEMA.gallery, conditions),
      buildDeleteQuery: (conditions) =>
        buildDeleteQuery(SCHEMA.gallery, conditions),
    },
    galleryPhoto: {
      mapRow: () => {
        throw CONST.ERROR_NOT_IMPLEMENTED;
      },
      mapInsert: (galleryPhoto) => {
        return [galleryPhoto.galleryId, galleryPhoto.photoId];
      },

      buildCreateQuery: () => buildCreateQuery(SCHEMA.galleryPhoto),
      buildSelectByIdQuery: () => buildSelectByIdQuery(SCHEMA.galleryPhoto),
      buildUpdateByIdQuery: (data) =>
        buildUpdateByIdQuery(SCHEMA.galleryPhoto, data),
      buildDeleteByIdQuery: () => buildDeleteByIdQuery(SCHEMA.galleryPhoto),

      buildSelectQuery: (conditions) =>
        buildSelectQuery(SCHEMA.galleryPhoto, conditions),
      buildDeleteQuery: (conditions) =>
        buildDeleteQuery(SCHEMA.galleryPhoto, conditions),
    },
    photo: {
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
            focalLength: toNumber(row.focal),
            aperture: toNumber(row.fstop),
            exposureTime: toNumber(row.exposure_time),
            iso: toNumber(row.iso),
          },
          dimensions: {
            original: {
              width: toNumber(row.orig_width),
              height: toNumber(row.orig_height),
            },
            display: {
              width: toNumber(row.disp_width),
              height: toNumber(row.disp_height),
            },
            thumbnail: {
              width: toNumber(row.thumb_width),
              height: toNumber(row.thumb_height),
            },
          },
        };
      },
      mapInsert: (photo) => {
        const map = SCHEMA.photo.mapToRow(photo);
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

      buildCreateQuery: () => buildCreateQuery(SCHEMA.photo),
      buildSelectByIdQuery: () => buildSelectByIdQuery(SCHEMA.photo),
      buildUpdateByIdQuery: (data) => buildUpdateByIdQuery(SCHEMA.photo, data),
      buildDeleteByIdQuery: () => buildDeleteByIdQuery(SCHEMA.photo),

      buildSelectQuery: (conditions) =>
        buildSelectQuery(SCHEMA.photo, conditions),
      buildDeleteQuery: (conditions) =>
        buildDeleteQuery(SCHEMA.photo, conditions),
    },
  };
};

const SCHEMA = {
  meta: {
    table: "meta",
    columns: ["key", "value"],
    primaryKey: ["key"],
    order: ["key ASC"],
    mapToRow: (meta) => {
      const result = {};
      if ("key" in user) result[meta.key] = meta.value;
      return result;
    },
  },
  user: {
    table: "user",
    columns: ["id", "password", "secret"],
    primaryKey: ["id"],
    order: ["id ASC"],
    mapToRow: (user) => {
      const result = {};
      if ("password" in user) result.password = user.password;
      if ("secret" in user) result.secret = user.secret;
      return result;
    },
  },
  acl: {
    table: "acl",
    columns: ["user_id", "gallery_id", "level"],
    primaryKey: ["user_id", "gallery_id"],
    order: ["user_id ASC", "gallery_id ASC"],
    mapToRow: (acl) => {
      const result = {};
      if ("level" in acl) result.level = acl.level;
      return result;
    },
  },
  gallery: {
    table: "gallery",
    columns: [
      "id",
      "title",
      "description",
      "icon",
      "epoch",
      "epoch_type",
      "theme",
      "initial_view",
      "hostname",
    ],
    primaryKey: ["id"],
    order: ["id ASC"],
    mapToRow: (gallery) => {
      const result = {};
      if ("title" in gallery) result.title = gallery.title;
      if ("description" in gallery) result.description = gallery.description;
      if ("icon" in gallery) result.icon = gallery.icon;
      if ("epoch" in gallery) result.epoch = gallery.epoch;
      if ("epochType" in gallery) result.epoch_type = gallery.epochType;
      if ("theme" in gallery) result.theme = gallery.theme;
      if ("initialView" in gallery) result.initial_view = gallery.initialView;
      if ("hostname" in gallery) result.hostname = gallery.hostname;
      return result;
    },
  },
  galleryPhoto: {
    table: "gallery_photo",
    columns: ["gallery_id", "photo_id"],
    primaryKey: ["gallery_id", "photo_id"],
    order: ["gallery_id ASC", "photo_id ASC"],
    mapToRow: () => {
      return {};
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
    primaryKey: ["id"],
    order: ["taken ASC", "id ASC"],
    mapToRow: (photo) => {
      const result = {};
      if ("title" in photo) result.title = photo.title;
      if ("description" in photo) result.description = photo.description;
      if (isSubTree(photo, "taken")) {
        const taken = photo.taken;
        if ("author" in taken) result.author = taken.author;
        if (isSubTree(taken, "instant")) {
          const instant = taken.instant;
          if ("timestamp" in instant) result.taken = instant.timestamp;
        }
        if (isSubTree(taken, "location")) {
          const location = taken.location;
          if ("country" in location) result.country_code = location.country;
          if ("place" in location) result.place = location.place;
          if (isSubTree(location, "coordinates")) {
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
      if (isSubTree(photo, "camera")) {
        const camera = photo.camera;
        if ("make" in camera) result.camera_make = camera.make;
        if ("model" in camera) result.camera_model = camera.model;
        if ("serial" in camera) result.camera_serial = camera.serial;
      }
      if (isSubTree(photo, "lens")) {
        const lens = photo.lens;
        if ("make" in lens) result.lens_make = lens.make;
        if ("model" in lens) result.lens_model = lens.model;
        if ("serial" in lens) result.lens_serial = lens.serial;
      }
      if (isSubTree(photo, "exposure")) {
        const exposure = photo.exposure;
        if ("focalLength" in exposure) result.focal = exposure.focalLength;
        if ("aperture" in exposure) result.fstop = exposure.aperture;
        if ("exposureTime" in exposure)
          result.exposure_time = exposure.exposureTime;
        if ("iso" in exposure) result.iso = exposure.iso;
      }
      if (isSubTree(photo, "dimensions")) {
        const dimensions = photo.dimensions;
        if (isSubTree(dimensions, "original")) {
          const original = dimensions.original;
          if ("width" in original) result.orig_width = original.width;
          if ("height" in original) result.orig_height = original.height;
        }
        if (isSubTree(dimensions, "display")) {
          const display = dimensions.display;
          if ("width" in display) result.disp_width = display.width;
          if ("height" in display) result.disp_height = display.height;
        }
        if (isSubTree(dimensions, "thumbnail")) {
          const thumbnail = dimensions.thumbnail;
          if ("width" in thumbnail) result.thumb_width = thumbnail.width;
          if ("height" in thumbnail) result.thumb_height = thumbnail.height;
        }
      }
      return result;
    },
  },
};

const isSubTree = (obj, key) => key in obj && typeof obj[key] === "object";
const toString = (str) => {
  if (str === null || str === undefined) {
    return "";
  }
  return String(str);
};
const toNumber = (num) => {
  if (num === null || num === undefined) {
    return undefined;
  }
  return Number(num);
};

const buildSelectQuery = (schema, conditions) => {
  const columns = schema.columns.join(",");
  return (
    `SELECT ${columns} FROM ${schema.table}` +
    (conditions && conditions.length > 0
      ? " WHERE " + conditions.join(" AND ")
      : "") +
    ` ORDER BY ${schema.order}`
  );
};
const buildCreateQuery = (schema) => {
  const columns = schema.columns;
  const placeholders = columns.map(() => "?").join(",");
  return `INSERT INTO ${schema.table} (${columns}) VALUES (${placeholders})`;
};
const buildSelectByIdQuery = (schema) => {
  const columns = schema.columns.join(",");
  return (
    `SELECT ${columns} FROM ${schema.table}` +
    " WHERE " +
    schema.primaryKey.map((key) => `${key} = ?`).join(" AND ") +
    ` ORDER BY ${schema.order}`
  );
};
const buildUpdateByIdQuery = (schema, data) => {
  if (!data) {
    return { query: undefined, values: undefined };
  }
  schema.primaryKey.forEach((key) => delete data[key]);
  if (Object.keys(data).length === 0) {
    return { query: undefined, values: undefined };
  }
  const columnData = schema.mapToRow(data);
  const columns = schema.columns.filter((column) => column in columnData);
  const cleanData = Object.fromEntries(
    columns.map((column) => [column, columnData[column]])
  );
  const placeholders = columns.map((column) => `${column}=?`).join(", ");
  const values = columns.map((column) => cleanData[column]);
  const query =
    `UPDATE ${schema.table} SET ${placeholders} WHERE ` +
    schema.primaryKey.map((key) => `${key} = ?`).join(" AND ");
  return { query, values };
};
const buildDeleteByIdQuery = (schema) => {
  return (
    `DELETE FROM ${schema.table} WHERE ` +
    schema.primaryKey.map((key) => `${key} = ?`).join(" AND ")
  );
};
const buildDeleteQuery = (schema, conditions) => {
  return (
    `DELETE FROM ${schema.table}` +
    (conditions && conditions.length > 0
      ? " WHERE " + conditions.join(" AND ")
      : "")
  );
};
