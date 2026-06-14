import { NotImplementedError } from "../../lib/errors.js";
import { acceptLocalizedCity } from "../../lib/localized-script.js";

// Raw DB row shapes (one per table). Mirror the SELECT column list exactly.
export interface MetaRow {
  key: string;
  value: string;
}
export interface UserRow {
  id: string;
  name: string;
  password: string;
  secret: string;
  is_admin: number;
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
  // Row presence alone grants VIEW; is_editor=1 upgrades that row to gallery editor.
  is_editor: number;
  // Privacy toggle: 1 = hide map/coordinates, 0 = show; NULL inherits the
  // next outer level (gallery override → instance default).
  hide_map: number | null;
  // 1 = grant covers gallery_photo rows flagged `is_private`; 0 = public-only.
  // Editors implicitly see private; admins always do.
  can_see_private: number;
}
export interface GroupRow {
  id: string;
  name: string;
  description: string;
}
export interface UserGroupRow {
  user_id: string;
  group_id: string;
}
export interface GroupGalleryRow {
  group_id: string;
  gallery_id: string;
  is_editor: number;
  hide_map: number | null;
  can_see_private: number;
}
// Three flavours of gallery row. `real` rows have photos linked via
// `gallery_photo`; `hybrid` rows have sources in `virtual_gallery_source`
// and union those sources' photos; `saved_filter` rows have a single
// source + a stored filter in `gallery_saved_filter`, presented to
// readers as a narrowed view of the source.
export type GalleryType = "real" | "hybrid" | "saved_filter";

export interface GalleryRow {
  id: string;
  title: string;
  description: string;
  icon: string;
  icon_source: string | null;
  epoch: string;
  epoch_type: string;
  theme: string;
  initial_view: string;
  hostname: string;
  // Operator-set primary language for the canonical `title` /
  // `description` columns. Always set since migration 022 — NULLs
  // backfill to 'en' on upgrade, and new galleries take the value
  // from `.env DEFAULT_LANGUAGE` (server create path) or 'en' as
  // the column default.
  default_language: string;
  type: GalleryType;
  // Operator-curated sort index (#585). Drives the primary sort
  // for `loadGalleries`; id is the tiebreak. Untouched rows
  // (all-zero) preserve the id-ASC order they had before.
  ordinal: number;
}
export interface GalleryLocalizedRow {
  gallery_id: string;
  lang: string;
  title: string | null;
  description: string | null;
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
  focal_35mm_equiv: number | null;
  fstop: number | null;
  exposure_time: number | null;
  iso: number | null;
  orig_width: number | null;
  orig_height: number | null;
  disp_width: number | null;
  disp_height: number | null;
  thumb_width: number | null;
  thumb_height: number | null;
  // English-canonical reverse-geocoded fields. Other languages live
  // in `photo_localized`. See migration 007.
  geocoded_country_code: string | null;
  geocoded_state_code: string | null;
  geocoded_city: string | null;
  geocoded_address: string | null; // raw Nominatim address JSON
  // Negative-result cache: 1 = Nominatim has no data here, intake
  // and the backfill daemon both skip the row.
  geocode_no_data: number;
  // JSON-stringified output of the converter's read-exif at intake.
  // NULL for rows that pre-date migration 014.
  exif_at_intake: string | null;
  // Privacy flag: 1 = only admins, gallery-editors, and viewers with
  // `can_see_private` on the gallery they're using see this photo.
  // Default 0 = public to anyone with view access on a gallery the
  // photo's in. See migration 026.
  is_private: number;
}

export interface PhotoLocalizedRow {
  photo_id: string;
  lang: string;
  geocoded_city: string | null;
  geocoded_address: string | null;
  // Operator-set overlays for the canonical photo columns. NULL when
  // the row exists only for the geocoded overlay. See migration 021.
  title: string | null;
  description: string | null;
  place: string | null;
}

// App-side shapes (what mapRow returns / mapInsert and mapToRow take).
export type Meta = Record<string, string>;
export type User = UserRow;
// `(galleryId, isAdmin)` — row presence in the underlying table already
// implies VIEW; isAdmin upgrades to gallery admin.
export type UserGalleryAccess = [galleryId: string, isAdmin: number];
export type Group = GroupRow;
export interface Gallery {
  id: string;
  title: string;
  description: string;
  icon: string;
  iconSource?: string | null;
  epoch: string;
  epochType: string;
  theme: string;
  initialView: string;
  hostname: string;
  // Operator-set primary language for the canonical title /
  // description columns. Always set (NOT NULL from migration 022).
  // Drives the canonical/overlay shuffle on change: when the
  // operator switches this, the server copies the old canonical
  // into the old default's overlay slot and pulls the new default's
  // overlay into canonical. The client uses it to label the
  // canonical input and as a fallback when the viewer has no UI
  // language preference.
  defaultLanguage: string;
  // Per-language overlays for title / description. Keyed by lang
  // code (e.g. `ja`, `fi`); empty `{}` when no overlay rows exist.
  // Canonical fields above stay the universal fallback.
  titleLocalized?: Record<string, string>;
  descriptionLocalized?: Record<string, string>;
  // Discriminates how the gallery's photos are resolved at read
  // time. See `GalleryType`.
  type: GalleryType;
  // Operator-curated sort index (#585). 0 by default; lower comes
  // first. Tiebreak is gallery id ASC.
  ordinal: number;
  // Hybrid galleries only: source gallery IDs whose photos union
  // into this one. Undefined for real and saved-filter galleries.
  sources?: string[];
  // Saved-filter galleries only: source gallery + the stored
  // baseline filter applied on top of the source's photos. The
  // public read path merges this into incoming /query / /counts
  // bodies (filter union per category, dateRange intersection).
  // Undefined for real and hybrid galleries.
  savedFilter?: {
    sourceGalleryId: string;
    definition: Record<string, unknown>;
  };
}
export interface VirtualGallerySourceRow {
  gallery_id: string;
  source_id: string;
  ordinal: number;
}
// Side table for saved-filter galleries. Storage shape only — the
// app layer projects this onto `Gallery.savedFilter` and exposes the
// admin DTO `SavedFilter` below.
export interface GallerySavedFilterRow {
  gallery_id: string;
  source_gallery_id: string;
  // JSON string. Wire shape: `{ filter?: FilterShape, dateRange?: DateRange }`.
  definition: string;
}
// Admin / public DTO for a saved-filter gallery. Carries the
// gallery's identifying fields plus the source pointer and parsed
// definition — what /galleries/:gallery/filters endpoints accept
// and return. Title / description / *Localized are projected from
// the underlying gallery row + gallery_localized; `sourceGalleryId`
// from gallery_saved_filter.
export interface SavedFilter {
  id: string;
  sourceGalleryId: string;
  title: string;
  description: string;
  titleLocalized: Record<string, string>;
  descriptionLocalized: Record<string, string>;
  definition: Record<string, unknown>;
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
  // Per-language overlays for the canonical title / description columns.
  // Keyed by lang code (e.g. `ja`, `fi`); empty `{}` when no overlay rows
  // exist. The placeLocalized companion lives next to its canonical at
  // `taken.location.placeLocalized` below. Canonical columns stay the
  // universal fallback — client resolves `titleLocalized[lang] ?? title`.
  titleLocalized?: Record<string, string>;
  descriptionLocalized?: Record<string, string>;
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
      placeLocalized?: Record<string, string>;
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
    focalLength35mmEquiv: number | undefined;
    aperture: number | undefined;
    exposureTime: number | undefined;
    iso: number | undefined;
  };
  dimensions: {
    original: { width: number | undefined; height: number | undefined };
    display: { width: number | undefined; height: number | undefined };
    thumbnail: { width: number | undefined; height: number | undefined };
  };
  // Reverse-geocoded location. Country / state come from language-
  // independent ISO codes; city is the only field that varies by
  // language (merged from `photo_localized` when present). The raw
  // Nominatim address blob is kept for re-derivation.
  geocoded: {
    countryCode: string | undefined;
    stateCode: string | undefined;
    city: string | undefined;
    // EN-canonical city (photo-row value, never the localized
    // merge). Used as the language-stable key for the city overlay
    // + filter / grouping tuple. Always set when `city` is set.
    cityEn: string | undefined;
    address: Record<string, unknown> | undefined;
    noData: boolean;
  };
  // Parsed JSON blob of the EXIF read at converter intake. Undefined
  // for rows pre-dating migration 014. Operator-only fields the admin
  // sets (title, description, place, country override) aren't in here;
  // this is the camera's raw output.
  exifAtIntake: Record<string, unknown> | undefined;
  // Operator-set visibility flag. False for everyone by default;
  // when true the row is hidden from view-only viewers unless their
  // grant on the gallery they're using carries `can_see_private`.
  isPrivate: boolean;
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
        name: toString(row.name),
        password: toString(row.password),
        secret: toString(row.secret),
        is_admin: Number(row.is_admin ?? 0),
      }),
      mapInsert: (user: User): unknown[] => [
        user.id,
        user.name,
        user.password,
        user.secret,
        user.is_admin ? 1 : 0,
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
        row.is_editor,
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
    group: {
      mapRow: (row: GroupRow): Group => ({
        id: toString(row.id),
        name: toString(row.name),
        description: toString(row.description),
      }),
      mapInsert: (group: Group): unknown[] => [
        group.id,
        group.name,
        group.description,
      ],
      buildCreateQuery: () => buildCreateQuery(SCHEMA.group),
      buildSelectByIdQuery: () => buildSelectByIdQuery(SCHEMA.group),
      buildUpdateByIdQuery: (data: Partial<Group>) =>
        buildUpdateByIdQuery(SCHEMA.group, data),
      buildDeleteByIdQuery: () => buildDeleteByIdQuery(SCHEMA.group),
      buildSelectQuery: (conditions?: Conditions) =>
        buildSelectQuery(SCHEMA.group, conditions),
      buildDeleteQuery: (conditions?: Conditions) =>
        buildDeleteQuery(SCHEMA.group, conditions),
    },
    userGroup: {
      mapRow: (row: UserGroupRow): UserGroupRow => row,
      mapInsert: (row: UserGroupRow): unknown[] => [row.user_id, row.group_id],
      buildCreateQuery: () => buildCreateQuery(SCHEMA.userGroup),
      buildSelectByIdQuery: () => buildSelectByIdQuery(SCHEMA.userGroup),
      buildUpdateByIdQuery: () => ({ query: undefined, values: undefined }),
      buildDeleteByIdQuery: () => buildDeleteByIdQuery(SCHEMA.userGroup),
      buildSelectQuery: (conditions?: Conditions) =>
        buildSelectQuery(SCHEMA.userGroup, conditions),
      buildDeleteQuery: (conditions?: Conditions) =>
        buildDeleteQuery(SCHEMA.userGroup, conditions),
    },
    groupGallery: {
      mapRow: (row: GroupGalleryRow): GroupGalleryRow => row,
      mapInsert: (): unknown[] => {
        throw new NotImplementedError();
      },
      buildCreateQuery: () => buildCreateQuery(SCHEMA.groupGallery),
      buildSelectByIdQuery: () => buildSelectByIdQuery(SCHEMA.groupGallery),
      buildUpdateByIdQuery: (data: Partial<GroupGalleryRow>) =>
        buildUpdateByIdQuery(SCHEMA.groupGallery, data),
      buildDeleteByIdQuery: () => buildDeleteByIdQuery(SCHEMA.groupGallery),
      buildSelectQuery: (conditions?: Conditions) =>
        buildSelectQuery(SCHEMA.groupGallery, conditions),
      buildDeleteQuery: (conditions?: Conditions) =>
        buildDeleteQuery(SCHEMA.groupGallery, conditions),
    },
    gallery: {
      mapRow: (
        row: GalleryRow,
        localized?: GalleryLocalizedRow[]
      ): Gallery => ({
        id: toString(row.id),
        title: toString(row.title),
        description: toString(row.description),
        icon: toString(row.icon),
        iconSource: row.icon_source ?? null,
        epoch: toString(row.epoch).substring(0, 10),
        epochType: toString(row.epoch_type),
        theme: toString(row.theme),
        initialView: toString(row.initial_view),
        hostname: toString(row.hostname),
        defaultLanguage: row.default_language || "en",
        titleLocalized: buildLocalizedMap(localized, "title"),
        descriptionLocalized: buildLocalizedMap(localized, "description"),
        type: row.type ?? "real",
        ordinal: row.ordinal ?? 0,
      }),
      mapInsert: (gallery: Gallery): unknown[] => [
        gallery.id,
        gallery.title,
        gallery.description,
        gallery.icon,
        gallery.iconSource ?? null,
        gallery.epoch,
        gallery.epochType,
        gallery.theme,
        gallery.initialView,
        gallery.hostname,
        gallery.defaultLanguage || "en",
        gallery.type ?? "real",
        gallery.ordinal ?? 0,
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
      // `localizedRows` (optional) is all photo_localized rows for the
      // photo across every language. Two consumers:
      //   - `lang` (optional) requests an EN-canonical-overlay for
      //     `geocoded.city` (Nominatim's localized label). Falls back
      //     to English when the script doesn't match the requested
      //     language or no row exists.
      //   - The operator-set `titleLocalized` / `descriptionLocalized`
      //     / `placeLocalized` maps are built from every row's column,
      //     regardless of `lang` — the client resolves
      //     `titleLocalized[lang] ?? title` itself. (Operator-set
      //     canonical isn't tied to English the way geocoded is.)
      mapRow: (
        row: PhotoRow,
        index: number,
        localizedRows?: PhotoLocalizedRow[],
        lang?: string
      ): Photo => {
        const taken = new Date(toString(row.taken).substring(0, 19));
        const normalizeCountry = (country: string | null) =>
          !country || country === "unknown" ? undefined : country;
        const pick = (
          loc: string | null | undefined,
          en: string | null
        ): string | undefined => loc ?? en ?? undefined;
        const langRow = lang
          ? localizedRows?.find((r) => r.lang === lang)
          : undefined;
        // Per-lang validation rejects values whose script doesn't
        // match the language (Nominatim falls back to local OSM
        // labels when no localized form exists). Falls through to en.
        const pickLocalizedCity = (
          loc: string | null | undefined,
          en: string | null
        ): string | undefined =>
          acceptLocalizedCity(loc, langRow?.lang ?? "")
            ? pick(loc, en)
            : en ?? undefined;

        return {
          id: toString(row.id),
          originalFilename: row.original_filename ?? undefined,
          index,
          title: toString(row.title),
          description: toString(row.description),
          titleLocalized: buildLocalizedMap(localizedRows, "title"),
          descriptionLocalized: buildLocalizedMap(localizedRows, "description"),
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
              placeLocalized: buildLocalizedMap(localizedRows, "place"),
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
            focalLength35mmEquiv: toNumber(row.focal_35mm_equiv),
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
          geocoded: {
            // country_code is language-independent — only ever from the
            // photo column, never `photo_localized`.
            countryCode: normalizeCountry(row.geocoded_country_code),
            stateCode: row.geocoded_state_code ?? undefined,
            city: pickLocalizedCity(langRow?.geocoded_city, row.geocoded_city),
            cityEn: row.geocoded_city ?? undefined,
            address: (() => {
              const raw = langRow?.geocoded_address ?? row.geocoded_address;
              if (!raw) return undefined;
              try {
                return JSON.parse(raw) as Record<string, unknown>;
              } catch {
                return undefined;
              }
            })(),
            noData: row.geocode_no_data === 1,
          },
          exifAtIntake: (() => {
            if (!row.exif_at_intake) return undefined;
            try {
              return JSON.parse(row.exif_at_intake) as Record<string, unknown>;
            } catch {
              return undefined;
            }
          })(),
          isPrivate: !!row.is_private,
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
          map.focal_35mm_equiv,
          map.fstop,
          map.exposure_time,
          map.iso,

          map.orig_width,
          map.orig_height,
          map.disp_width,
          map.disp_height,
          map.thumb_width,
          map.thumb_height,

          map.geocoded_country_code,
          map.geocoded_state_code,
          map.geocoded_city,
          map.geocoded_address,

          0, // geocode_no_data: defaults to 0 (not yet attempted)
          map.exif_at_intake,
          map.is_private ?? 0,
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
  if ("name" in user) result.name = user.name;
  if ("password" in user) result.password = user.password;
  if ("secret" in user) result.secret = user.secret;
  if ("is_admin" in user) result.is_admin = user.is_admin ? 1 : 0;
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
  if ("is_editor" in userGallery)
    result.is_editor = userGallery.is_editor ? 1 : 0;
  if ("hide_map" in userGallery) result.hide_map = userGallery.hide_map;
  if ("can_see_private" in userGallery)
    result.can_see_private = userGallery.can_see_private ? 1 : 0;
  return result;
};
const groupMapToRow = (group: Partial<GroupRow>): Record<string, unknown> => {
  const result: Record<string, unknown> = {};
  if ("name" in group) result.name = group.name;
  if ("description" in group) result.description = group.description;
  return result;
};
const groupGalleryMapToRow = (
  row: Partial<GroupGalleryRow>
): Record<string, unknown> => {
  const result: Record<string, unknown> = {};
  if ("is_editor" in row) result.is_editor = row.is_editor ? 1 : 0;
  if ("hide_map" in row) result.hide_map = row.hide_map;
  if ("can_see_private" in row)
    result.can_see_private = row.can_see_private ? 1 : 0;
  return result;
};
const galleryMapToRow = (
  gallery: GalleryInput
): Record<string, unknown> => {
  const result: Record<string, unknown> = {};
  if ("title" in gallery) result.title = gallery.title;
  if ("description" in gallery) result.description = gallery.description;
  if ("icon" in gallery) result.icon = gallery.icon;
  if ("iconSource" in gallery) result.icon_source = gallery.iconSource;
  if ("epoch" in gallery) result.epoch = gallery.epoch;
  if ("epochType" in gallery) result.epoch_type = gallery.epochType;
  if ("theme" in gallery) result.theme = gallery.theme;
  if ("initialView" in gallery) result.initial_view = gallery.initialView;
  if ("hostname" in gallery) result.hostname = gallery.hostname;
  if ("defaultLanguage" in gallery)
    result.default_language = gallery.defaultLanguage;
  if ("type" in gallery) result.type = gallery.type;
  if ("ordinal" in gallery) result.ordinal = gallery.ordinal;
  return result;
};

// Collapse a list of `*_localized` rows into a `{lang: value}` map for
// a specific column. Rows with NULL in the target column are skipped
// (the row may exist for another field's overlay — e.g. a photo's
// geocoded_city row has no operator-set title yet).
export const buildLocalizedMap = <T extends { lang: string }>(
  rows: T[] | undefined,
  field: keyof T
): Record<string, string> => {
  const map: Record<string, string> = {};
  if (!rows) return map;
  for (const row of rows) {
    const value = row[field];
    if (typeof value === "string" && value !== "") map[row.lang] = value;
  }
  return map;
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
    if ("focalLength35mmEquiv" in exposure)
      result.focal_35mm_equiv = exposure.focalLength35mmEquiv;
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
  if (photo.geocoded) {
    const g = photo.geocoded;
    if ("countryCode" in g) result.geocoded_country_code = g.countryCode;
    if ("stateCode" in g) result.geocoded_state_code = g.stateCode;
    if ("city" in g) result.geocoded_city = g.city;
    if ("address" in g) {
      // Address is a Nominatim raw object; store as JSON string.
      // Pass-through if already string.
      result.geocoded_address =
        typeof g.address === "string"
          ? g.address
          : g.address === undefined
            ? undefined
            : JSON.stringify(g.address);
    }
  }
  if ("exifAtIntake" in photo) {
    const blob = photo.exifAtIntake;
    result.exif_at_intake =
      typeof blob === "string"
        ? blob
        : blob === undefined || blob === null
          ? null
          : JSON.stringify(blob);
  }
  if ("isPrivate" in photo) {
    result.is_private = photo.isPrivate ? 1 : 0;
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
    columns: ["id", "name", "password", "secret", "is_admin"],
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
    columns: ["user_id", "gallery_id", "is_editor", "hide_map", "can_see_private"],
    primaryKey: ["user_id", "gallery_id"],
    order: ["user_id ASC", "gallery_id ASC"],
    mapToRow: userGalleryMapToRow as (data: Record<string, unknown>) => Record<string, unknown>,
  },
  group: {
    table: '"group"',
    columns: ["id", "name", "description"],
    primaryKey: ["id"],
    order: ["id ASC"],
    mapToRow: groupMapToRow as (data: Record<string, unknown>) => Record<string, unknown>,
  },
  userGroup: {
    table: "user_group",
    columns: ["user_id", "group_id"],
    primaryKey: ["user_id", "group_id"],
    order: ["user_id ASC", "group_id ASC"],
    mapToRow: (): Record<string, unknown> => ({}),
  },
  groupGallery: {
    table: "group_gallery",
    columns: ["group_id", "gallery_id", "is_editor", "hide_map", "can_see_private"],
    primaryKey: ["group_id", "gallery_id"],
    order: ["group_id ASC", "gallery_id ASC"],
    mapToRow: groupGalleryMapToRow as (data: Record<string, unknown>) => Record<string, unknown>,
  },
  gallery: {
    table: "gallery",
    columns: [
      "id",
      "title",
      "description",
      "icon",
      "icon_source",
      "epoch",
      "epoch_type",
      "theme",
      "initial_view",
      "hostname",
      "default_language",
      "type",
      "ordinal",
    ],
    primaryKey: ["id"],
    // Operator-curated sort (#585) — `ordinal` is the primary key
    // and `id` the tiebreak so all-zero (untouched) rows preserve
    // their previous id-ASC order.
    order: ["ordinal ASC", "id ASC"],
    mapToRow: galleryMapToRow as (data: Record<string, unknown>) => Record<string, unknown>,
  },
  gallerySavedFilter: {
    table: "gallery_saved_filter",
    columns: ["gallery_id", "source_gallery_id", "definition"],
    primaryKey: ["gallery_id"],
    order: ["gallery_id ASC"],
    mapToRow: (): Record<string, unknown> => ({}),
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
      "focal_35mm_equiv",
      "fstop",
      "exposure_time",
      "iso",

      "orig_width",
      "orig_height",
      "disp_width",
      "disp_height",
      "thumb_width",
      "thumb_height",

      "geocoded_country_code",
      "geocoded_state_code",
      "geocoded_city",
      "geocoded_address",

      "geocode_no_data",
      "exif_at_intake",
      "is_private",
    ],
    primaryKey: ["id"],
    // Tiebreak same-second shots by `original_filename`, which carries
    // the camera's zero-padded sequence counter (e.g. `_2198`, `_2200`).
    // String sort matches numeric sort within a single camera, so action-
    // burst frames stay in shoot order. `id` (uuid) is the final tiebreak.
    order: ["taken ASC", "original_filename ASC", "id ASC"],
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
  if (columns.length === 0) {
    // Patch had keys, but none mapped to a real column on this
    // table (e.g. a virtual-gallery `sources`-only update on the
    // gallery table). Caller handles the non-column side itself.
    return { query: undefined, values: undefined };
  }
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
