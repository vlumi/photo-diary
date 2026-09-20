import CONST from "../../lib/constants.js";
import { NotFoundError } from "../../lib/errors.js";
import { acceptLocalizedCity } from "../../lib/localized-script.js";
import {
  type GalleryLocalizedRow,
  type PhotoInput,
  type PhotoLocalizedRow,
  type PhotoRow,
} from "./schema.js";
import { SCHEMA, db, deleteById } from "./connection.js";
import { photoPassesBaseline, resolveGalleryRef } from "./virtual-galleries.js";

// Load every photo_localized row for the requested ids, grouped by
// photo_id. mapRow consumes the array to (a) build the per-field
// `titleLocalized` / `descriptionLocalized` / `placeLocalized` maps
// for operator-set fields and (b) pick the EN-canonical overlay for
// `geocoded.city` when a `lang` argument is also passed. Returns an
// empty Map for empty input; photos without any localized rows are
// simply absent from the result.
// Ordered ascending so srcset descriptors emerge in width order.
export const loadRenditionsFor = (photoIds: string[]): Map<string, number[]> => {
  if (photoIds.length === 0) return new Map();
  const placeholders = photoIds.map(() => "?").join(",");
  const rows = db
    .prepare(
      `SELECT photo_id, max_dim FROM photo_rendition
        WHERE photo_id IN (${placeholders})
        ORDER BY max_dim ASC`
    )
    .all(...photoIds) as Array<{ photo_id: string; max_dim: number }>;
  const byId = new Map<string, number[]>();
  for (const r of rows) {
    const list = byId.get(r.photo_id);
    if (list) list.push(r.max_dim);
    else byId.set(r.photo_id, [r.max_dim]);
  }
  return byId;
};

export const attachRenditions = <T extends { id: string; renditions: number[] }>(
  photos: T[]
): void => {
  const byId = loadRenditionsFor(photos.map((p) => p.id));
  for (const p of photos) {
    p.renditions = byId.get(p.id) ?? [];
  }
};

export const loadLocalizedFor = (
  photoIds: string[]
): Map<string, PhotoLocalizedRow[]> => {
  if (photoIds.length === 0) return new Map();
  const placeholders = photoIds.map(() => "?").join(",");
  const rows = db
    .prepare(
      `SELECT * FROM photo_localized WHERE photo_id IN (${placeholders})`
    )
    .all(...photoIds) as PhotoLocalizedRow[];
  const byId = new Map<string, PhotoLocalizedRow[]>();
  for (const r of rows) {
    const list = byId.get(r.photo_id);
    if (list) list.push(r);
    else byId.set(r.photo_id, [r]);
  }
  return byId;
};
// Gallery analogue — gallery_localized rows grouped by gallery_id.
// Returns empty Map for empty input; galleries without overlays are
// absent from the result. mapRow surfaces the `titleLocalized` and
// `descriptionLocalized` maps from the array.
export const loadGalleryLocalizedFor = (
  galleryIds: string[]
): Map<string, GalleryLocalizedRow[]> => {
  if (galleryIds.length === 0) return new Map();
  const placeholders = galleryIds.map(() => "?").join(",");
  const rows = db
    .prepare(
      `SELECT * FROM gallery_localized WHERE gallery_id IN (${placeholders})`
    )
    .all(...galleryIds) as GalleryLocalizedRow[];
  const byId = new Map<string, GalleryLocalizedRow[]>();
  for (const r of rows) {
    const list = byId.get(r.gallery_id);
    if (list) list.push(r);
    else byId.set(r.gallery_id, [r]);
  }
  return byId;
};

export const loadPhotos = async (lang?: string) => {
  const rows = db.prepare(SCHEMA.photo.buildSelectQuery()).all() as PhotoRow[];
  const localized = loadLocalizedFor(rows.map((r) => r.id));
  const photos = rows.map((row, index) =>
    SCHEMA.photo.mapRow(row, index, localized.get(row.id), lang)
  );
  attachRenditions(photos);
  return photos;
};
export const createPhoto = async (photo: PhotoInput) => {
  db.prepare(SCHEMA.photo.buildCreateQuery()).run(
    SCHEMA.photo.mapInsert(photo)
  );
  // Process localized overlays from the same payload — symmetrical
  // with updatePhoto. Most creates (converter intake) don't include
  // these, so the loop is a no-op there.
  const photoId = photo.id;
  if (!photoId) return;
  const perLang = collectPhotoLocalizedPatch(photo);
  for (const [lang, fields] of perLang) {
    upsertPhotoLocalizedFields(photoId, lang, fields);
  }
};

export const upsertPhotoRendition = async (
  photoId: string,
  maxDim: number
): Promise<void> => {
  db.prepare(
    `INSERT INTO photo_rendition (photo_id, max_dim) VALUES (?, ?)
       ON CONFLICT(photo_id, max_dim) DO NOTHING`
  ).run(photoId, maxDim);
};
export const loadAllPhotoRenditions = async (): Promise<
  Array<{ photoId: string; maxDim: number }>
> => {
  const rows = db
    .prepare(
      `SELECT photo_id, max_dim FROM photo_rendition
         ORDER BY photo_id ASC, max_dim ASC`
    )
    .all() as Array<{ photo_id: string; max_dim: number }>;
  return rows.map((r) => ({ photoId: r.photo_id, maxDim: r.max_dim }));
};
export const deletePhotoRendition = async (
  photoId: string,
  maxDim: number
): Promise<void> => {
  db.prepare(
    "DELETE FROM photo_rendition WHERE photo_id = ? AND max_dim = ?"
  ).run(photoId, maxDim);
};
export const loadPhoto = async (photoId: string, lang?: string) => {
  const row = db.prepare(SCHEMA.photo.buildSelectByIdQuery()).get(photoId) as
    | PhotoRow
    | undefined;
  if (!row) throw new NotFoundError();
  const localizedRows = db
    .prepare("SELECT * FROM photo_localized WHERE photo_id = ?")
    .all(photoId) as PhotoLocalizedRow[];
  const photo = SCHEMA.photo.mapRow(row, 0, localizedRows, lang);
  attachRenditions([photo]);
  return photo;
};
// Filename matching is case-insensitive: cameras vary on extension
// case (Fuji writes `.JPG`, others `.jpg`), and operator-generated
// JSON sidecars often normalize to lowercase. A case-sensitive `=`
// match meant the sidecar would miss its existing row and create a
// phantom photo with the lowercase-id form alongside the real
// uppercase-original_filename row.
export const loadPhotosByOriginalFilename = async (originalFilename: string) => {
  const rows = db
    .prepare(
      SCHEMA.photo.buildSelectQuery(["original_filename = ? COLLATE NOCASE"])
    )
    .all(originalFilename) as PhotoRow[];
  return rows.map((row, index) => SCHEMA.photo.mapRow(row, index));
};
// Gallery-scoped lookup by camera filename — drives the Photo
// modal's fallback when the URL's id doesn't resolve to a real
// photo. Returns the first row (operator's archive can in
// principle have collisions; the modal lands on whichever the DB
// returns first, and the caller redirects to its canonical URL).
export const loadGalleryPhotoByOriginalFilename = async (
  galleryId: string,
  originalFilename: string,
  lang?: string,
  includePrivate = false
) => {
  const schema = SCHEMA.photo;
  const ref = resolveGalleryRef(galleryId);
  if (ref.sources.length === 0) throw new NotFoundError();
  const placeholders = ref.sources.map(() => "?").join(", ");
  const conditions = [
    `id IN (SELECT photo_id FROM gallery_photo WHERE gallery_id IN (${placeholders}))`,
    "original_filename = ? COLLATE NOCASE",
  ];
  if (!includePrivate) conditions.push("is_private = 0");
  const stmt = db.prepare(schema.buildSelectQuery(conditions));
  const rows = stmt.all(...ref.sources, originalFilename) as PhotoRow[];
  if (rows.length === 0) {
    throw new NotFoundError();
  }
  const localizedRows = db
    .prepare("SELECT * FROM photo_localized WHERE photo_id = ?")
    .all(rows[0].id) as PhotoLocalizedRow[];
  const photo = schema.mapRow(rows[0], 0, localizedRows, lang);
  if (!photoPassesBaseline(photo, ref)) {
    throw new NotFoundError();
  }
  attachRenditions([photo]);
  return photo;
};
// Photo rows with no gallery_photo link — useful for `bin/photo.ts audit`.
// The SPA doesn't surface orphan photos anywhere; they're a data-drift
// signal the operator might want to clean up (or deliberately keep as
// unfiled, the model allows it).
export const loadOrphanPhotoIds = async (): Promise<string[]> => {
  const rows = db
    .prepare(
      "SELECT id FROM photo WHERE id NOT IN (SELECT photo_id FROM gallery_photo) ORDER BY id ASC"
    )
    .all() as Array<{ id: string }>;
  return rows.map((r) => r.id);
};
// gallery_photo rows whose `photo_id` points at a row that no longer
// exists. Surfaces real data corruption — exactly the dailybw FK
// violation the migrate post-check catches.
export const loadOrphanGalleryPhotoLinks = async (): Promise<
  Array<{ galleryId: string; photoId: string; missing: "photo" | "gallery" }>
> => {
  const photoMissing = db
    .prepare(
      "SELECT gallery_id, photo_id FROM gallery_photo " +
        "WHERE photo_id NOT IN (SELECT id FROM photo) " +
        "ORDER BY gallery_id ASC, photo_id ASC"
    )
    .all() as Array<{ gallery_id: string; photo_id: string }>;
  const galleryMissing = db
    .prepare(
      "SELECT gallery_id, photo_id FROM gallery_photo " +
        "WHERE gallery_id NOT IN (SELECT id FROM gallery) " +
        "ORDER BY gallery_id ASC, photo_id ASC"
    )
    .all() as Array<{ gallery_id: string; photo_id: string }>;
  return [
    ...photoMissing.map((r) => ({
      galleryId: r.gallery_id,
      photoId: r.photo_id,
      missing: "photo" as const,
    })),
    ...galleryMissing.map((r) => ({
      galleryId: r.gallery_id,
      photoId: r.photo_id,
      missing: "gallery" as const,
    })),
  ];
};
// Gallery IDs with no photos linked.
export const loadEmptyGalleryIds = async (): Promise<string[]> => {
  const rows = db
    .prepare(
      "SELECT id FROM gallery WHERE id NOT IN (SELECT gallery_id FROM gallery_photo) ORDER BY id ASC"
    )
    .all() as Array<{ id: string }>;
  return rows.map((r) => r.id);
};
// user_gallery rows whose referenced user or gallery is gone.
export const loadOrphanUserGalleryRows = async (): Promise<
  Array<{ userId: string; galleryId: string; missing: "user" | "gallery" }>
> => {
  const userMissing = db
    .prepare(
      "SELECT user_id, gallery_id FROM user_gallery " +
        "WHERE user_id != ? AND user_id NOT IN (SELECT id FROM user) " +
        "ORDER BY user_id ASC, gallery_id ASC"
    )
    .all(CONST.GUEST_USER) as Array<{
    user_id: string;
    gallery_id: string;
  }>;
  const galleryMissing = db
    .prepare(
      "SELECT user_id, gallery_id FROM user_gallery " +
        "WHERE gallery_id NOT IN (SELECT id FROM gallery) " +
        "ORDER BY user_id ASC, gallery_id ASC"
    )
    .all() as Array<{
    user_id: string;
    gallery_id: string;
  }>;
  return [
    ...userMissing.map((r) => ({
      userId: r.user_id,
      galleryId: r.gallery_id,
      missing: "user" as const,
    })),
    ...galleryMissing.map((r) => ({
      userId: r.user_id,
      galleryId: r.gallery_id,
      missing: "gallery" as const,
    })),
  ];
};
export const updatePhoto = async (photoId: string, photo: PhotoInput) => {
  const { query, values } = SCHEMA.photo.buildUpdateByIdQuery(photo);
  if (query && values) {
    db.prepare(query).run([...values, photoId]);
  }
  // Per-language overlays for operator-set fields. Each map is
  // {lang: value}; empty string clears that column (NULL in DB);
  // omitting a lang leaves the existing column unchanged; an empty
  // map is a no-op. Mixed cols per row — title may exist in `ja`
  // while description does not, and the row carries the column the
  // request touched.
  const perLang = collectPhotoLocalizedPatch(photo);
  for (const [lang, fields] of perLang) {
    upsertPhotoLocalizedFields(photoId, lang, fields);
  }
};
export const collectPhotoLocalizedPatch = (
  photo: PhotoInput
): Map<string, { title?: string | null; description?: string | null; place?: string | null }> => {
  const byLang = new Map<string, { title?: string | null; description?: string | null; place?: string | null }>();
  const merge = (
    map: Record<string, string | undefined> | undefined,
    field: "title" | "description" | "place"
  ) => {
    if (!map) return;
    for (const [lang, value] of Object.entries(map)) {
      if (value === undefined) continue;
      const entry = byLang.get(lang) ?? {};
      entry[field] = value === "" ? null : value;
      byLang.set(lang, entry);
    }
  };
  merge(photo.titleLocalized, "title");
  merge(photo.descriptionLocalized, "description");
  merge(photo.taken?.location?.placeLocalized, "place");
  return byLang;
};
export const upsertPhotoLocalizedFields = (
  photoId: string,
  lang: string,
  fields: { title?: string | null; description?: string | null; place?: string | null }
): void => {
  const cols: string[] = [];
  const vals: unknown[] = [];
  if (fields.title !== undefined) {
    cols.push("title");
    vals.push(fields.title);
  }
  if (fields.description !== undefined) {
    cols.push("description");
    vals.push(fields.description);
  }
  if (fields.place !== undefined) {
    cols.push("place");
    vals.push(fields.place);
  }
  if (cols.length === 0) return;
  const colList = cols.join(", ");
  const placeholders = cols.map(() => "?").join(", ");
  const updates = cols.map((c) => `${c} = excluded.${c}`).join(", ");
  db.prepare(
    `INSERT INTO photo_localized (photo_id, lang, ${colList})
     VALUES (?, ?, ${placeholders})
     ON CONFLICT (photo_id, lang) DO UPDATE SET ${updates}`
  ).run(photoId, lang, ...vals);
};
// Re-key a photo across photo + gallery_photo. The FK on gallery_photo
// is RESTRICT (no ON UPDATE CASCADE), so we toggle foreign_keys off
// for the duration of the transaction — SQLite requires this to be
// done outside any open transaction.
export const renamePhoto = async (oldId: string, newId: string) => {
  db.pragma("foreign_keys = OFF");
  try {
    const tx = db.transaction(() => {
      db.prepare("UPDATE photo SET id = ? WHERE id = ?").run(newId, oldId);
      db.prepare("UPDATE gallery_photo SET photo_id = ? WHERE photo_id = ?").run(
        newId,
        oldId
      );
    });
    tx();
  } finally {
    db.pragma("foreign_keys = ON");
  }
};
export const deletePhoto = async (photoId: string) =>
  deleteById(SCHEMA.photo, photoId);

// Geocoded fields for one (photo, lang) pair. English routes to the
// photo columns directly; everything else goes to photo_localized
// (upsert). `address` is stringified JSON; pass `null` to clear.
export interface GeocodedFields {
  countryCode?: string | null; // language-independent (photo column)
  stateCode?: string | null; // language-independent (photo column)
  city?: string | null;
  address?: string | null; // JSON
}
export const upsertGeocoded = async (
  photoId: string,
  lang: string,
  fields: GeocodedFields
) => {
  if (lang === "en") {
    const updates: string[] = [];
    const values: unknown[] = [];
    const addField = (col: string, val: unknown) => {
      if (val === undefined) return;
      updates.push(`${col} = ?`);
      values.push(val);
    };
    addField("geocoded_country_code", fields.countryCode);
    addField("geocoded_state_code", fields.stateCode);
    addField("geocoded_city", fields.city);
    addField("geocoded_address", fields.address);
    if (updates.length === 0) return;
    db.prepare(
      `UPDATE photo SET ${updates.join(", ")} WHERE id = ?`
    ).run(...values, photoId);
    // Auto-fill operator country_code from the geocoded value when
    // the operator hasn't set one, so the country filter / Stats
    // pick up coordinate-derived photos uniformly.
    if (fields.countryCode) {
      db.prepare(
        "UPDATE photo SET country_code = ? WHERE id = ? AND (country_code IS NULL OR country_code = '')"
      ).run(fields.countryCode, photoId);
    }
    return;
  }
  // Per-lang validation drops values whose script doesn't match
  // the language (Nominatim's `?accept-language=<lang>` falls back
  // to OSM local labels when no localized form exists). When the
  // city is rejected, drop the address blob too — every per-row
  // label inside it (`city`, `neighborhood`, `suburb`, `town`…)
  // carries the same script and would leak through to consumers
  // that read the raw blob (PhotoDrawer's maritime fallback, state
  // / city derivation, future address-aware UIs). Read path falls
  // through to the en row's blob when this row's columns are NULL.
  //
  // ON CONFLICT replaces directly (no COALESCE) so a re-geocode
  // where the new result is rejected actually clears the old
  // kanji blob — every caller of the non-en branch writes the
  // full geocoder result, never a partial.
  const cityOk = acceptLocalizedCity(fields.city, lang);
  const city = cityOk ? (fields.city ?? null) : null;
  const address = cityOk ? (fields.address ?? null) : null;
  db.prepare(
    `INSERT INTO photo_localized
       (photo_id, lang, geocoded_city, geocoded_address)
     VALUES (?, ?, ?, ?)
     ON CONFLICT (photo_id, lang) DO UPDATE SET
       geocoded_city    = excluded.geocoded_city,
       geocoded_address = excluded.geocoded_address`
  ).run(photoId, lang, city, address);
};

// Flag a photo as "Nominatim has no address for these coordinates" so
// subsequent intake / daemon runs skip it instead of retrying. Operator
// clears `geocode_no_data` back to 0 to force a fresh attempt.
export const markGeocodeNoData = async (photoId: string): Promise<void> => {
  db.prepare("UPDATE photo SET geocode_no_data = 1 WHERE id = ?").run(photoId);
};

// Reset every geocode-derived column to NULL so the admin coord-edit
// flow can hand off to the converter without leaving stale values
// visible in the meantime. `geocode_no_data` resets to 0 so the next
// intake / daemon run will retry instead of skipping. The per-language
// rows in `photo_localized` lose their `geocoded_city` too (FK CASCADE
// would drop the row entirely, which we don't want — the
// `geocoded_address` raw blob stays for audit / re-localize, only the
// derived city goes NULL).
export const clearGeocoded = async (photoId: string): Promise<void> => {
  db.prepare(
    `UPDATE photo SET
       geocoded_country_code = NULL,
       geocoded_state_code   = NULL,
       geocoded_city         = NULL,
       geocoded_address      = NULL,
       geocode_no_data       = 0
     WHERE id = ?`
  ).run(photoId);
  db.prepare(
    "UPDATE photo_localized SET geocoded_city = NULL WHERE photo_id = ?"
  ).run(photoId);
};

// Daemon's "give me work" query — photos with coords that are missing
// geocoded data for the requested language. Recent first by capture
// timestamp; rows with no timestamp (EXIF-less imports) go to the back
// so the visible / recently-shot photos get filled in earliest.
// Rows flagged `geocode_no_data` are skipped — Nominatim has no
// address for those coordinates and retrying would just spin.
export const loadPhotosMissingGeocoded = async (
  lang: string,
  limit: number
): Promise<Array<{ id: string; lat: number; lon: number }>> => {
  const sql =
    lang === "en"
      ? `SELECT id, coord_lat, coord_lon FROM photo
           WHERE coord_lat IS NOT NULL AND coord_lon IS NOT NULL
             AND geocoded_city IS NULL
             AND geocode_no_data = 0
           ORDER BY taken IS NULL, taken DESC, id ASC
           LIMIT ?`
      : `SELECT p.id, p.coord_lat, p.coord_lon FROM photo p
           LEFT JOIN photo_localized pl
             ON pl.photo_id = p.id AND pl.lang = ?
           WHERE p.coord_lat IS NOT NULL AND p.coord_lon IS NOT NULL
             AND pl.photo_id IS NULL
             AND p.geocode_no_data = 0
           ORDER BY p.taken IS NULL, p.taken DESC, p.id ASC
           LIMIT ?`;
  const rows = (lang === "en"
    ? db.prepare(sql).all(limit)
    : db.prepare(sql).all(lang, limit)) as Array<{
    id: string;
    coord_lat: number;
    coord_lon: number;
  }>;
  return rows.map((r) => ({
    id: r.id,
    lat: r.coord_lat,
    lon: r.coord_lon,
  }));
};

export const loadPhotoLocalized = async (
  lang: string
): Promise<
  Array<{
    photo_id: string;
    geocoded_city: string | null;
    geocoded_address: string | null;
  }>
> => {
  return db
    .prepare(
      "SELECT photo_id, geocoded_city, geocoded_address FROM photo_localized WHERE lang = ?"
    )
    .all(lang) as Array<{
    photo_id: string;
    geocoded_city: string | null;
    geocoded_address: string | null;
  }>;
};

export const clearLocalizedCity = async (
  photoId: string,
  lang: string
): Promise<void> => {
  // Clears both the derived city AND the raw address blob — the
  // blob's labels (city, suburb, neighborhood…) share the script
  // that just failed `acceptLocalizedCity`, so keeping the blob
  // would leak the same characters via PhotoDrawer's maritime
  // fallback / address-aware UIs. Row stays (no DELETE) so the
  // daemon's loadPhotosMissingGeocoded query keeps treating this
  // (photo, lang) pair as already attempted.
  db.prepare(
    `UPDATE photo_localized
       SET geocoded_city = NULL, geocoded_address = NULL
     WHERE photo_id = ? AND lang = ?`
  ).run(photoId, lang);
};
