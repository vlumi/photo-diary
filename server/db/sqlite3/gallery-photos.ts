import { NotFoundError } from "../../lib/errors.js";
import {
  matchesDateRange,
  matchesFilter,
  matchesNumericRanges,
  type DateRange,
  type FilterShape,
  type NumericRanges,
} from "../../lib/photo-filter-eval.js";
import { buildAnnotations, buildCategoryCounts, buildCategoryValues } from "../../lib/stats-compute.js";
import {
  type GalleryPhoto,
  type Photo,
  type PhotoLocalizedRow,
  type PhotoRow,
} from "./schema.js";
import { SCHEMA, db } from "./connection.js";
import { attachRenditions, loadLocalizedFor, loadPhotos } from "./photos.js";
import { applyBaseline, photoPassesBaseline, resolveGalleryRef } from "./virtual-galleries.js";

export const loadGalleryPhotos = async (
  galleryId: string,
  lang?: string,
  includePrivate = false
) => {
  const schema = SCHEMA.photo;
  const ref = resolveGalleryRef(galleryId);
  if (ref.sources.length === 0) return [];
  // Hybrid galleries widen the gallery_id check from `= ?`
  // to `IN (?, ?, …)`. Real galleries resolve to `[galleryId]`,
  // producing the same single-id IN-clause. Saved-filter galleries
  // resolve to `[source_gallery_id]` + a baseline applied below in
  // JS — the SQL load is identical to a real source.
  const placeholders = ref.sources.map(() => "?").join(", ");
  const conditions = [
    `id IN (SELECT photo_id FROM gallery_photo WHERE gallery_id IN (${placeholders}))`,
  ];
  // `photo.is_private = 0` filter is fail-closed: callers must opt
  // in with `includePrivate=true` (only after the authorizer
  // confirms the viewer holds can_see_private on this gallery, or
  // is admin / editor).
  if (!includePrivate) conditions.push("is_private = 0");
  const stmt = db.prepare(schema.buildSelectQuery(conditions));
  const rows = stmt.all(...ref.sources) as PhotoRow[];
  const localized = loadLocalizedFor(rows.map((r) => r.id));
  const photos = rows.map((row, index) =>
    schema.mapRow(row, index, localized.get(row.id), lang)
  );
  attachRenditions(photos);
  return applyBaseline(photos, ref);
};
export const linkGalleryPhoto = async (
  galleryIds: string[],
  photoIds: string[]
) => {
  const stmt = db.prepare(
    SCHEMA.galleryPhoto.buildCreateQuery().replace("INSERT", "INSERT OR IGNORE")
  );
  const insertAll = db.transaction(() => {
    photoIds.forEach((photoId) => {
      galleryIds.forEach((galleryId) => {
        const link: GalleryPhoto = { galleryId, photoId };
        stmt.run(SCHEMA.galleryPhoto.mapInsert(link));
      });
    });
  });
  insertAll();
};

export const loadAllGalleryPhotoLinks = async (): Promise<
  Array<{ galleryId: string; photoId: string }>
> => {
  const rows = db
    .prepare("SELECT gallery_id, photo_id FROM gallery_photo")
    .all() as Array<{ gallery_id: string; photo_id: string }>;
  return rows.map((r) => ({ galleryId: r.gallery_id, photoId: r.photo_id }));
};
export interface QueryFilteredOpts {
  filter?: FilterShape;
  dateRange?: DateRange;
  numericRanges?: NumericRanges;
  year?: number;
  month?: number;
  day?: number;
  lang?: string;
  includePrivate?: boolean;
}
export const matchesScope = (
  photo: Photo,
  year?: number,
  month?: number,
  day?: number
): boolean => {
  const instant = photo.taken.instant;
  if (year !== undefined && instant.year !== year) return false;
  if (month !== undefined && instant.month !== month) return false;
  if (day !== undefined && instant.day !== day) return false;
  return true;
};
// Load the gallery's photos via the same SQL path as
// `loadGalleryPhotos`, then evaluate FilterShape + (year, month,
// day) scope in JS. For SQLite the round-trip is free, so load-all-
// and-filter is the right shape; the boundary moves here so the
// model layer doesn't have to know which is which. A Postgres
// driver can replace this body with a parameterized WHERE.
export const queryFilteredPhotos = async (
  galleryId: string,
  opts: QueryFilteredOpts = {}
): Promise<Photo[]> => {
  const photos = (await loadGalleryPhotos(
    galleryId,
    opts.lang,
    opts.includePrivate
  )) as Photo[];
  return photos.filter(
    (photo) =>
      matchesScope(photo, opts.year, opts.month, opts.day) &&
      matchesDateRange(opts.dateRange, photo) &&
      matchesNumericRanges(opts.numericRanges, photo) &&
      matchesFilter(opts.filter, photo)
  );
};
// Cross-gallery counterpart of `queryFilteredPhotos`. Loads every
// photo (no gallery scope) and applies the same FilterShape /
// optional year/month/day predicate. Drives the GlobalStats Location
// map's filter-aware photo set without needing to fan out per-gallery
// queries.
export const queryFilteredPhotosGlobal = async (
  opts: QueryFilteredOpts = {}
): Promise<Photo[]> => {
  const photos = (await loadPhotos(opts.lang)) as Photo[];
  return photos.filter(
    (photo) =>
      matchesScope(photo, opts.year, opts.month, opts.day) &&
      matchesDateRange(opts.dateRange, photo) &&
      matchesNumericRanges(opts.numericRanges, photo) &&
      matchesFilter(opts.filter, photo)
  );
};

export interface CountsFilteredOpts {
  filter?: FilterShape;
  dateRange?: DateRange;
  numericRanges?: NumericRanges;
  year?: number;
  includePrivate?: boolean;
}
export const queryFilteredPhotoCounts = async (
  galleryId: string,
  opts: CountsFilteredOpts = {}
): Promise<Record<string, number>> => {
  const photos = (await loadGalleryPhotos(
    galleryId,
    undefined,
    opts.includePrivate
  )) as Photo[];
  const out: Record<string, number> = {};
  for (const photo of photos) {
    const instant = photo.taken.instant;
    if (opts.year !== undefined && instant.year !== opts.year) continue;
    if (!matchesDateRange(opts.dateRange, photo)) continue;
    if (!matchesNumericRanges(opts.numericRanges, photo)) continue;
    if (!matchesFilter(opts.filter, photo)) continue;
    const key = `${instant.year}-${String(instant.month).padStart(
      2,
      "0"
    )}-${String(instant.day).padStart(2, "0")}`;
    out[key] = (out[key] ?? 0) + 1;
  }
  return out;
};

export interface NeighborsFilteredOpts {
  filter?: FilterShape;
  dateRange?: DateRange;
  numericRanges?: NumericRanges;
  lang?: string;
  includePrivate?: boolean;
}
export interface NeighborsResult {
  previous?: Photo;
  next?: Photo;
  first?: Photo;
  last?: Photo;
  position?: number;
  total: number;
}
export const queryFilteredPhotoNeighbors = async (
  galleryId: string,
  photoId: string,
  opts: NeighborsFilteredOpts = {}
): Promise<NeighborsResult> => {
  const all = (await loadGalleryPhotos(
    galleryId,
    opts.lang,
    opts.includePrivate
  )) as Photo[];
  const filtered = all
    .filter(
      (p) =>
        matchesDateRange(opts.dateRange, p) &&
        matchesNumericRanges(opts.numericRanges, p) &&
        matchesFilter(opts.filter, p)
    )
    .sort((a, b) =>
      a.taken.instant.timestamp.localeCompare(b.taken.instant.timestamp)
    );
  if (filtered.length === 0) return { total: 0 };
  const first = filtered[0];
  const last = filtered[filtered.length - 1];
  const index = filtered.findIndex((p) => p.id === photoId);
  if (index < 0) {
    // Current photo not in filtered set — first / last still
    // useful; previous / next undefined; position omitted.
    return { first, last, total: filtered.length };
  }
  const previous = index > 0 ? filtered[index - 1] : undefined;
  const next = index < filtered.length - 1 ? filtered[index + 1] : undefined;
  return {
    previous,
    next,
    first,
    last,
    position: index + 1,
    total: filtered.length,
  };
};

// Filter pill universe + city localized-label map for a gallery
//. Loads the gallery's photos and projects per-category
// distinct values via the shared `buildCategoryValues`, then maps
// stats's camelCase category names to the kebab-case shape the
// FilterShape wire format + the client filter UI both use. Adds
// the two categories `buildByCategory` doesn't bucket but the
// pills want — `year-month` (derived from photo instants) and
// `geotagged` (constant yes/no so the pill stays selectable).
export interface FilterValuesResult {
  categoryValues: Record<string, string[]>;
  // Per-value photo counts per category — drives the filter widget's
  // top-N sort so the operator sees the most-populated values first.
  // Same kebab-case category names as `categoryValues`. Synthetic
  // categories (`geotagged`, `year-month`) get inline-bucketed counts
  // since they aren't part of `buildByCategory`.
  categoryCounts: Record<string, Record<string, number>>;
  byCityLocalized: Record<string, string>;
}
export const yearMonthOf = (photo: Photo): string => {
  const i = photo.taken.instant;
  return `${i.year}-${String(i.month).padStart(2, "0")}`;
};
export const isGeotagged = (photo: Photo): boolean => {
  const coords = photo.taken?.location?.coordinates;
  return (
    coords !== undefined &&
    coords !== null &&
    coords.latitude !== null &&
    coords.longitude !== null
  );
};
// Shared projection from the photo set into the kebab-case
// FilterShape universe. Used by both the gallery-scoped
// `queryGalleryFilterValues` and the global cross-gallery flavor.
// Photos array is already filtered to the appropriate scope by the
// caller.
//
// `filter` + `dateRange` drive a single-pass facet for counts —
// `categoryValues` stays the unfiltered universe (so search can
// find any value), but counts reflect the active filter set so the
// client's top-N sort favours values that produce a hit under the
// current pick. Same filter applied to every category; the client
// decides whether to display 0-count chips based on whether the
// category itself is actively filtered.
export const buildFilterValuesFromPhotos = (
  photos: Photo[],
  filter?: FilterShape,
  dateRange?: DateRange,
  numericRanges?: NumericRanges
): FilterValuesResult => {
  const cv = buildCategoryValues(photos);
  const annotations = buildAnnotations(photos);
  const yearMonthSet = new Set<string>();
  for (const p of photos) {
    yearMonthSet.add(yearMonthOf(p));
  }
  const yearMonths = [...yearMonthSet].sort();
  const noFilter = !filter || Object.keys(filter).length === 0;
  const noDateRange =
    !dateRange || (!dateRange.from && !dateRange.to);
  const noNumericRanges =
    !numericRanges || Object.keys(numericRanges).length === 0;
  const subset =
    noFilter && noDateRange && noNumericRanges
      ? photos
      : photos.filter(
        (p) =>
          matchesFilter(filter, p) &&
          matchesDateRange(dateRange, p) &&
          matchesNumericRanges(numericRanges, p)
      );
  const cc = buildCategoryCounts(subset);
  const yearMonthCounts: Record<string, number> = {};
  const geotaggedCounts: Record<string, number> = { yes: 0, no: 0 };
  for (const p of subset) {
    yearMonthCounts[yearMonthOf(p)] =
      (yearMonthCounts[yearMonthOf(p)] ?? 0) + 1;
    geotaggedCounts[isGeotagged(p) ? "yes" : "no"] += 1;
  }
  return {
    categoryValues: {
      author: cv.author ?? [],
      country: cv.country ?? [],
      state: cv.state ?? [],
      city: cv.city ?? [],
      geotagged: ["yes", "no"],
      year: cv.year ?? [],
      "year-month": yearMonths,
      month: cv.month ?? [],
      weekday: cv.weekday ?? [],
      hour: cv.hour ?? [],
      "camera-make": cv.cameraMake ?? [],
      camera: cv.camera ?? [],
      lens: cv.lens ?? [],
      "camera-lens": cv.cameraLens ?? [],
      "focal-length": cv.focalLength ?? [],
      "focal-length-eq": cv.focalLength35mmEquiv ?? [],
      aperture: cv.aperture ?? [],
      "exposure-time": cv.exposureTime ?? [],
      iso: cv.iso ?? [],
      ev: cv.ev ?? [],
      lv: cv.lv ?? [],
      resolution: cv.resolution ?? [],
      orientation: cv.orientation ?? [],
      "aspect-ratio": cv.aspectRatio ?? [],
    },
    categoryCounts: {
      author: cc.author ?? {},
      country: cc.country ?? {},
      state: cc.state ?? {},
      city: cc.city ?? {},
      geotagged: geotaggedCounts,
      year: cc.year ?? {},
      "year-month": yearMonthCounts,
      month: cc.month ?? {},
      weekday: cc.weekday ?? {},
      hour: cc.hour ?? {},
      "camera-make": cc.cameraMake ?? {},
      camera: cc.camera ?? {},
      lens: cc.lens ?? {},
      "camera-lens": cc.cameraLens ?? {},
      "focal-length": cc.focalLength ?? {},
      "focal-length-eq": cc.focalLength35mmEquiv ?? {},
      aperture: cc.aperture ?? {},
      "exposure-time": cc.exposureTime ?? {},
      iso: cc.iso ?? {},
      ev: cc.ev ?? {},
      lv: cc.lv ?? {},
      resolution: cc.resolution ?? {},
      orientation: cc.orientation ?? {},
      "aspect-ratio": cc.aspectRatio ?? {},
    },
    byCityLocalized: annotations.byCityLocalized,
  };
};
export const queryGalleryFilterValues = async (
  galleryId: string,
  lang?: string,
  filter?: FilterShape,
  dateRange?: DateRange,
  numericRanges?: NumericRanges,
  includePrivate = false
): Promise<FilterValuesResult> => {
  const photos = (await loadGalleryPhotos(
    galleryId,
    lang,
    includePrivate
  )) as Photo[];
  return buildFilterValuesFromPhotos(photos, filter, dateRange, numericRanges);
};
export const queryGlobalFilterValues = async (
  lang?: string,
  filter?: FilterShape,
  dateRange?: DateRange,
  numericRanges?: NumericRanges
): Promise<FilterValuesResult> => {
  const photos = (await loadPhotos(lang)) as Photo[];
  return buildFilterValuesFromPhotos(photos, filter, dateRange, numericRanges);
};

export const loadGalleryPhoto = async (
  galleryId: string,
  photoId: string,
  lang?: string,
  includePrivate = false
) => {
  const schema = SCHEMA.photo;
  const ref = resolveGalleryRef(galleryId);
  if (ref.sources.length === 0) throw new NotFoundError();
  const placeholders = ref.sources.map(() => "?").join(", ");
  const conditions = [
    `id IN (SELECT photo_id FROM gallery_photo WHERE gallery_id IN (${placeholders}))`,
    "id = ?",
  ];
  if (!includePrivate) conditions.push("is_private = 0");
  const stmt = db.prepare(schema.buildSelectQuery(conditions));
  const rows = stmt.all(...ref.sources, photoId) as PhotoRow[];
  if (rows.length === 0) {
    throw new NotFoundError();
  }
  const localizedRows = db
    .prepare("SELECT * FROM photo_localized WHERE photo_id = ?")
    .all(photoId) as PhotoLocalizedRow[];
  const photo = schema.mapRow(rows[0], 0, localizedRows, lang);
  // Saved-filter galleries: a photo that's in the source but
  // excluded by the baseline reads as NotFound on the saved filter,
  // matching how the photo list behaves.
  if (!photoPassesBaseline(photo, ref)) {
    throw new NotFoundError();
  }
  attachRenditions([photo]);
  return photo;
};
export const unlinkGalleryPhoto = async (galleryId: string, photoId: string) => {
  db.prepare(SCHEMA.galleryPhoto.buildDeleteByIdQuery()).run([
    galleryId,
    photoId,
  ]);
};
export const unlinkAllPhotos = async (galleryId: string) => {
  db.prepare(
    SCHEMA.galleryPhoto.buildDeleteQuery(["gallery_id = ?"])
  ).run([galleryId]);
};
export const unlinkAllGalleries = async (photoId: string) => {
  db.prepare(SCHEMA.galleryPhoto.buildDeleteQuery(["photo_id = ?"])).run([
    photoId,
  ]);
};
