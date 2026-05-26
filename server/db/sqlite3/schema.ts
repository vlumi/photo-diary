import { NotImplementedError } from "../../lib/errors.js";

// Raw DB row shapes (one per table). Mirror the SELECT column list exactly.
export interface MetaRow {
  key: string;
  value: string;
}
export interface UserRow {
  id: string;
  password: string;
  secret: string;
}
export interface SessionRow {
  id: string;
  user_id: string;
  refresh_token_hash: string;
  created_at: number;
  last_used_at: number;
}
export interface UserGalleryRow {
  user_id: string;
  gallery_id: string;
  access_level: number;
  // Privacy toggle: 1 = hide map/coordinates, 0 = show; NULL inherits the
  // next outer level (gallery override → instance default).
  hide_map: number | null;
}
export interface GalleryRow {
  id: string;
  title: string;
  description: string;
  icon: string;
  epoch: string;
  epoch_type: string;
  theme: string;
  initial_view: string;
  hostname: string;
}
export interface GalleryPhotoRow {
  gallery_id: string;
  photo_id: string;
}
export interface PhotoRow {
  id: string;
  original_filename: string | null;
  title: string;
  description: string;
  author: string;
  taken: string;
  country_code: string | null;
  place: string;
  coord_lat: number | null;
  coord_lon: number | null;
  coord_alt: number | null;
  camera_make: string;
  camera_model: string;
  camera_serial: string;
  lens_make: string;
  lens_model: string;
  lens_serial: string;
  focal: number | null;
  fstop: number | null;
  exposure_time: number | null;
  iso: number | null;
  orig_width: number | null;
  orig_height: number | null;
  disp_width: number | null;
  disp_height: number | null;
  thumb_width: number | null;
  thumb_height: number | null;
}

// App-side shapes (what mapRow returns / mapInsert and mapToRow take).
export type Meta = Record<string, string>;
export type User = UserRow;
export type UserGalleryAccess = [galleryId: string, accessLevel: number];
export interface Gallery {
  id: string;
  title: string;
  description: string;
  icon: string;
  epoch: string;
  epochType: string;
  theme: string;
  initialView: string;
  hostname: string;
}
export interface GalleryPhoto {
  galleryId: string;
  photoId: string;
}
export interface Photo {
  id: string;
  originalFilename: string | undefined;
  index: number;
  title: string;
  description: string;
  taken: {
    instant: {
      timestamp: string;
      year: number;
      month: number;
      day: number;
      hour: number;
      minute: number;
      second: number;
    };
    author: string;
    location: {
      country: string | undefined;
      place: string;
      coordinates: {
        latitude: number | null;
        longitude: number | null;
        altitude: number | null;
      };
    };
  };
  camera: { make: string; model: string; serial: string };
  lens: { make: string; model: string; serial: string };
  exposure: {
    focalLength: number | undefined;
    aperture: number | undefined;
    exposureTime: number | undefined;
    iso: number | undefined;
  };
  dimensions: {
    original: { width: number | undefined; height: number | undefined };
    display: { width: number | undefined; height: number | undefined };
    thumbnail: { width: number | undefined; height: number | undefined };
  };
}

// Partial input shapes for updates / inserts. DeepPartial so nested
// subtrees (e.g. photo.taken.location) can also be partially filled.
type DeepPartial<T> = T extends object
  ? { [K in keyof T]?: DeepPartial<T[K]> }
  : T;
export type GalleryInput = DeepPartial<Gallery>;
export type PhotoInput = DeepPartial<Photo>;

type Conditions = string[];

type TableSchema = {
  table: string;
  columns: string[];
  primaryKey: string[];
  order: string[];
  mapToRow?: (data: Record<string, unknown>) => Record<string, unknown>;
};

export default () => {
  return {
    meta: {
      mapRow: (row: MetaRow): Meta => ({
        [toString(row.key)]: toString(row.value),
      }),
      mapInsert: (meta: { key: string; value: string }): unknown[] => [
        meta.key,
        meta.value,
      ],

      buildCreateQuery: () => buildCreateQuery(SCHEMA.meta),
      buildSelectByIdQuery: () => buildSelectByIdQuery(SCHEMA.meta),
      buildUpdateByIdQuery: (data: Partial<MetaRow>) =>
        buildUpdateByIdQuery(SCHEMA.meta, data),
      buildDeleteByIdQuery: () => buildDeleteByIdQuery(SCHEMA.meta),

      buildSelectQuery: (conditions?: Conditions) =>
        buildSelectQuery(SCHEMA.meta, conditions),
      buildDeleteQuery: (conditions?: Conditions) =>
        buildDeleteQuery(SCHEMA.meta, conditions),
    },
    user: {
      mapRow: (row: UserRow): User => ({
        id: toString(row.id),
        password: toString(row.password),
        secret: toString(row.secret),
      }),
      mapInsert: (user: User): unknown[] => [
        user.id,
        user.password,
        user.secret,
      ],

      buildCreateQuery: () => buildCreateQuery(SCHEMA.user),
      buildSelectByIdQuery: () => buildSelectByIdQuery(SCHEMA.user),
      buildUpdateByIdQuery: (data: Partial<User>) =>
        buildUpdateByIdQuery(SCHEMA.user, data),
      buildDeleteByIdQuery: () => buildDeleteByIdQuery(SCHEMA.user),

      buildSelectQuery: (conditions?: Conditions) =>
        buildSelectQuery(SCHEMA.user, conditions),
      buildDeleteQuery: (conditions?: Conditions) =>
        buildDeleteQuery(SCHEMA.user, conditions),
    },
    session: {
      mapRow: (row: SessionRow): SessionRow => ({
        id: toString(row.id),
        user_id: toString(row.user_id),
        refresh_token_hash: toString(row.refresh_token_hash),
        created_at: Number(row.created_at),
        last_used_at: Number(row.last_used_at),
      }),
      mapInsert: (s: SessionRow): unknown[] => [
        s.id,
        s.user_id,
        s.refresh_token_hash,
        s.created_at,
        s.last_used_at,
      ],

      buildCreateQuery: () => buildCreateQuery(SCHEMA.session),
      buildSelectByIdQuery: () => buildSelectByIdQuery(SCHEMA.session),
      buildUpdateByIdQuery: (data: Partial<SessionRow>) =>
        buildUpdateByIdQuery(SCHEMA.session, data),
      buildDeleteByIdQuery: () => buildDeleteByIdQuery(SCHEMA.session),

      buildSelectQuery: (conditions?: Conditions) =>
        buildSelectQuery(SCHEMA.session, conditions),
      buildDeleteQuery: (conditions?: Conditions) =>
        buildDeleteQuery(SCHEMA.session, conditions),
    },
    userGallery: {
      mapRow: (row: UserGalleryRow): UserGalleryAccess => [
        row.gallery_id,
        row.access_level,
      ],
      mapInsert: (): unknown[] => {
        throw new NotImplementedError();
      },
      buildCreateQuery: () => buildCreateQuery(SCHEMA.userGallery),
      buildSelectByIdQuery: () => buildSelectByIdQuery(SCHEMA.userGallery),
      buildUpdateByIdQuery: (data: Partial<UserGalleryRow>) =>
        buildUpdateByIdQuery(SCHEMA.userGallery, data),
      buildDeleteByIdQuery: () => buildDeleteByIdQuery(SCHEMA.userGallery),

      buildSelectQuery: (conditions?: Conditions) =>
        buildSelectQuery(SCHEMA.userGallery, conditions),
      buildDeleteQuery: (conditions?: Conditions) =>
        buildDeleteQuery(SCHEMA.userGallery, conditions),
    },
    gallery: {
      mapRow: (row: GalleryRow): Gallery => ({
        id: toString(row.id),
        title: toString(row.title),
        description: toString(row.description),
        icon: toString(row.icon),
        epoch: toString(row.epoch).substring(0, 10),
        epochType: toString(row.epoch_type),
        theme: toString(row.theme),
        initialView: toString(row.initial_view),
        hostname: toString(row.hostname),
      }),
      mapInsert: (gallery: Gallery): unknown[] => [
        gallery.id,
        gallery.title,
        gallery.description,
        gallery.icon,
        gallery.epoch,
        gallery.epochType,
        gallery.theme,
        gallery.initialView,
        gallery.hostname,
      ],

      buildCreateQuery: () => buildCreateQuery(SCHEMA.gallery),
      buildSelectByIdQuery: () => buildSelectByIdQuery(SCHEMA.gallery),
      buildUpdateByIdQuery: (data: GalleryInput) =>
        buildUpdateByIdQuery(SCHEMA.gallery, data),
      buildDeleteByIdQuery: () => buildDeleteByIdQuery(SCHEMA.gallery),

      buildSelectQuery: (conditions?: Conditions) =>
        buildSelectQuery(SCHEMA.gallery, conditions),
      buildDeleteQuery: (conditions?: Conditions) =>
        buildDeleteQuery(SCHEMA.gallery, conditions),
    },
    galleryPhoto: {
      mapRow: (): GalleryPhoto => {
        throw new NotImplementedError();
      },
      mapInsert: (link: GalleryPhoto): unknown[] => [link.galleryId, link.photoId],

      buildCreateQuery: () => buildCreateQuery(SCHEMA.galleryPhoto),
      buildSelectByIdQuery: () => buildSelectByIdQuery(SCHEMA.galleryPhoto),
      buildUpdateByIdQuery: (data: Partial<GalleryPhotoRow>) =>
        buildUpdateByIdQuery(SCHEMA.galleryPhoto, data),
      buildDeleteByIdQuery: () => buildDeleteByIdQuery(SCHEMA.galleryPhoto),

      buildSelectQuery: (conditions?: Conditions) =>
        buildSelectQuery(SCHEMA.galleryPhoto, conditions),
      buildDeleteQuery: (conditions?: Conditions) =>
        buildDeleteQuery(SCHEMA.galleryPhoto, conditions),
    },
    photo: {
      mapRow: (row: PhotoRow, index: number): Photo => {
        const taken = new Date(toString(row.taken).substring(0, 19));
        const normalizeCountry = (country: string | null) =>
          !country || country === "unknown" ? undefined : country;

        return {
          id: toString(row.id),
          originalFilename: row.original_filename ?? undefined,
          index,
          title: toString(row.title),
          description: toString(row.description),
          taken: {
            instant: {
              timestamp: toString(row.taken),
              year: taken.getFullYear(),
              month: taken.getMonth() + 1,
              day: taken.getDate(),
              hour: taken.getHours(),
              minute: taken.getMinutes(),
              second: taken.getSeconds(),
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
      mapInsert: (photo: PhotoInput): unknown[] => {
        const map = photoMapToRow(photo);
        return [
          photo.id,
          map.original_filename,
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
      buildUpdateByIdQuery: (data: PhotoInput) =>
        buildUpdateByIdQuery(SCHEMA.photo, data),
      buildDeleteByIdQuery: () => buildDeleteByIdQuery(SCHEMA.photo),

      buildSelectQuery: (conditions?: Conditions) =>
        buildSelectQuery(SCHEMA.photo, conditions),
      buildDeleteQuery: (conditions?: Conditions) =>
        buildDeleteQuery(SCHEMA.photo, conditions),
    },
  };
};

// Per-table mapToRow: app-shape (possibly partial) → flat DB-column subset.
const metaMapToRow = (
  meta: Partial<MetaRow>
): Record<string, unknown> => {
  const result: Record<string, unknown> = {};
  if ("key" in meta) result.key = meta.key;
  if ("value" in meta) result.value = meta.value;
  return result;
};
const userMapToRow = (user: Partial<User>): Record<string, unknown> => {
  const result: Record<string, unknown> = {};
  if ("password" in user) result.password = user.password;
  if ("secret" in user) result.secret = user.secret;
  return result;
};
const sessionMapToRow = (
  s: Partial<SessionRow>
): Record<string, unknown> => {
  const result: Record<string, unknown> = {};
  if ("refresh_token_hash" in s) result.refresh_token_hash = s.refresh_token_hash;
  if ("last_used_at" in s) result.last_used_at = s.last_used_at;
  return result;
};
const userGalleryMapToRow = (
  userGallery: Partial<UserGalleryRow>
): Record<string, unknown> => {
  const result: Record<string, unknown> = {};
  if ("access_level" in userGallery) result.access_level = userGallery.access_level;
  return result;
};
const galleryMapToRow = (
  gallery: GalleryInput
): Record<string, unknown> => {
  const result: Record<string, unknown> = {};
  if ("title" in gallery) result.title = gallery.title;
  if ("description" in gallery) result.description = gallery.description;
  if ("icon" in gallery) result.icon = gallery.icon;
  if ("epoch" in gallery) result.epoch = gallery.epoch;
  if ("epochType" in gallery) result.epoch_type = gallery.epochType;
  if ("theme" in gallery) result.theme = gallery.theme;
  if ("initialView" in gallery) result.initial_view = gallery.initialView;
  if ("hostname" in gallery) result.hostname = gallery.hostname;
  return result;
};
const photoMapToRow = (photo: PhotoInput): Record<string, unknown> => {
  const result: Record<string, unknown> = {};
  if ("originalFilename" in photo) result.original_filename = photo.originalFilename;
  if ("title" in photo) result.title = photo.title;
  if ("description" in photo) result.description = photo.description;
  if (photo.taken) {
    const taken = photo.taken;
    if ("author" in taken) result.author = taken.author;
    if (taken.instant) {
      const instant = taken.instant;
      if ("timestamp" in instant) result.taken = instant.timestamp;
    }
    if (taken.location) {
      const location = taken.location;
      if ("country" in location) result.country_code = location.country;
      if ("place" in location) result.place = location.place;
      if (location.coordinates) {
        const coordinates = location.coordinates;
        if ("latitude" in coordinates) result.coord_lat = coordinates.latitude;
        if ("longitude" in coordinates) result.coord_lon = coordinates.longitude;
        if ("altitude" in coordinates) result.coord_alt = coordinates.altitude;
      }
    }
  }
  if (photo.camera) {
    const camera = photo.camera;
    if ("make" in camera) result.camera_make = camera.make;
    if ("model" in camera) result.camera_model = camera.model;
    if ("serial" in camera) result.camera_serial = camera.serial;
  }
  if (photo.lens) {
    const lens = photo.lens;
    if ("make" in lens) result.lens_make = lens.make;
    if ("model" in lens) result.lens_model = lens.model;
    if ("serial" in lens) result.lens_serial = lens.serial;
  }
  if (photo.exposure) {
    const exposure = photo.exposure;
    if ("focalLength" in exposure) result.focal = exposure.focalLength;
    if ("aperture" in exposure) result.fstop = exposure.aperture;
    if ("exposureTime" in exposure)
      result.exposure_time = exposure.exposureTime;
    if ("iso" in exposure) result.iso = exposure.iso;
  }
  if (photo.dimensions) {
    const dimensions = photo.dimensions;
    if (dimensions.original) {
      const original = dimensions.original;
      if ("width" in original) result.orig_width = original.width;
      if ("height" in original) result.orig_height = original.height;
    }
    if (dimensions.display) {
      const display = dimensions.display;
      if ("width" in display) result.disp_width = display.width;
      if ("height" in display) result.disp_height = display.height;
    }
    if (dimensions.thumbnail) {
      const thumbnail = dimensions.thumbnail;
      if ("width" in thumbnail) result.thumb_width = thumbnail.width;
      if ("height" in thumbnail) result.thumb_height = thumbnail.height;
    }
  }
  return result;
};

const SCHEMA = {
  meta: {
    table: "meta",
    columns: ["key", "value"],
    primaryKey: ["key"],
    order: ["key ASC"],
    mapToRow: metaMapToRow as (data: Record<string, unknown>) => Record<string, unknown>,
  },
  user: {
    table: "user",
    columns: ["id", "password", "secret"],
    primaryKey: ["id"],
    order: ["id ASC"],
    mapToRow: userMapToRow as (data: Record<string, unknown>) => Record<string, unknown>,
  },
  session: {
    table: "session",
    columns: [
      "id",
      "user_id",
      "refresh_token_hash",
      "created_at",
      "last_used_at",
    ],
    primaryKey: ["id"],
    order: ["last_used_at DESC"],
    mapToRow: sessionMapToRow as (data: Record<string, unknown>) => Record<string, unknown>,
  },
  userGallery: {
    table: "user_gallery",
    columns: ["user_id", "gallery_id", "access_level", "hide_map"],
    primaryKey: ["user_id", "gallery_id"],
    order: ["user_id ASC", "gallery_id ASC"],
    mapToRow: userGalleryMapToRow as (data: Record<string, unknown>) => Record<string, unknown>,
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
    mapToRow: galleryMapToRow as (data: Record<string, unknown>) => Record<string, unknown>,
  },
  galleryPhoto: {
    table: "gallery_photo",
    columns: ["gallery_id", "photo_id"],
    primaryKey: ["gallery_id", "photo_id"],
    order: ["gallery_id ASC", "photo_id ASC"],
    mapToRow: (): Record<string, unknown> => ({}),
  },
  photo: {
    table: "photo",
    columns: [
      "id",
      "original_filename",
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
    mapToRow: photoMapToRow as (data: Record<string, unknown>) => Record<string, unknown>,
  },
} satisfies Record<string, TableSchema>;

const toString = (str: unknown): string => {
  if (str === null || str === undefined) {
    return "";
  }
  return String(str);
};
const toNumber = (num: unknown): number | undefined => {
  if (num === null || num === undefined) {
    return undefined;
  }
  return Number(num);
};

const buildSelectQuery = (schema: TableSchema, conditions?: Conditions) => {
  const columns = schema.columns.join(",");
  return (
    `SELECT ${columns} FROM ${schema.table}` +
    (conditions && conditions.length > 0
      ? " WHERE " + conditions.join(" AND ")
      : "") +
    ` ORDER BY ${schema.order}`
  );
};
const buildCreateQuery = (schema: TableSchema) => {
  const columns = schema.columns;
  const placeholders = columns.map(() => "?").join(",");
  return `INSERT INTO ${schema.table} (${columns}) VALUES (${placeholders})`;
};
const buildSelectByIdQuery = (schema: TableSchema) => {
  const columns = schema.columns.join(",");
  return (
    `SELECT ${columns} FROM ${schema.table}` +
    " WHERE " +
    schema.primaryKey.map((key) => `${key} = ?`).join(" AND ") +
    ` ORDER BY ${schema.order}`
  );
};
const buildUpdateByIdQuery = (
  schema: TableSchema,
  data: Record<string, unknown>
) => {
  if (!data) {
    return { query: undefined, values: undefined };
  }
  const cleaned: Record<string, unknown> = { ...data };
  schema.primaryKey.forEach((key) => delete cleaned[key]);
  if (Object.keys(cleaned).length === 0) {
    return { query: undefined, values: undefined };
  }
  const columnData = schema.mapToRow ? schema.mapToRow(cleaned) : cleaned;
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
const buildDeleteByIdQuery = (schema: TableSchema) => {
  return (
    `DELETE FROM ${schema.table} WHERE ` +
    schema.primaryKey.map((key) => `${key} = ?`).join(" AND ")
  );
};
const buildDeleteQuery = (schema: TableSchema, conditions?: Conditions) => {
  return (
    `DELETE FROM ${schema.table}` +
    (conditions && conditions.length > 0
      ? " WHERE " + conditions.join(" AND ")
      : "")
  );
};
