// Stats orchestration. Loads photos from the DB and runs them
// through the pure `computeStats` aggregator in
// `lib/stats-compute.ts`. Two flavours:
//
//   - `getGalleryStats(galleryId, filter?, lang?)` — gallery-scoped,
//     drives `POST /api/v1/galleries/:id/stats`.
//   - `getGlobalStats(filter?, lang?)` — cross-gallery, drives
//     `POST /api/v1/stats` (admin-only). Same compute logic; the
//     only difference is which photos the DB layer hands us.
//
// Single-key cache per scope. The gallery flavour keys by gallery
// id (plus lang for non-en); the global flavour keys by a
// dedicated `:global` namespace. Filtered combinations bypass
// cache and compute on demand.

import db from "../db/index.js";
import type { Photo } from "../db/sqlite3/schema.js";
import { cacheGet, cacheSet } from "../lib/stats-cache.js";
import {
  computeStats,
  isUnfilteredBase,
  type StatsResponse,
} from "../lib/stats-compute.js";
import type { FilterShape } from "../lib/photo-filter-eval.js";

export default () => ({
  getGalleryStats,
  getGlobalStats,
  getGalleryFilterValues,
});

// Re-export the response shape + types so controllers and tests
// can stay model-rooted rather than reaching into lib/.
export type {
  BucketCounts,
  PeakShape,
  StatsResponse,
  StatsSummary,
  YearMonthCounts,
} from "../lib/stats-compute.js";
export { UNKNOWN_BUCKET } from "../lib/stats-compute.js";

// Cache namespace builder. `en` / no-lang shares the bare key so
// the most common path accrues hits across requests that don't
// ask for a localized overlay.
const galleryCacheKey = (galleryId: string, lang?: string): string =>
  !lang || lang === "en" ? galleryId : `${galleryId}:${lang}`;

// Distinct namespace so a gallery named "global" can't collide
// with the cross-gallery cache. Hostnames can't carry colons
// (gallery ids are slug-shaped) so the prefix is collision-free.
const globalCacheKey = (lang?: string): string =>
  !lang || lang === "en" ? ":global" : `:global:${lang}`;

const getGalleryStats = async (
  galleryId: string,
  filter?: FilterShape,
  lang?: string
): Promise<StatsResponse> => {
  const cacheable = isUnfilteredBase(filter);
  const key = galleryCacheKey(galleryId, lang);
  if (cacheable) {
    const cached = cacheGet<StatsResponse>(key);
    if (cached) return cached;
  }
  const photos = (await db.loadGalleryPhotos(galleryId, lang)) as Photo[];
  const stats = computeStats(photos, filter);
  if (cacheable) cacheSet(key, stats);
  return stats;
};

// Subset of the gallery's unfiltered stats — the universe the filter
// pill UI needs to render every selectable value (#532). Projection
// off `getGalleryStats` so the existing stats cache + invalidation
// hooks naturally apply; a cold gallery mount pays one stats compute
// then every subsequent visit serves out of cache. Filter pills want
// the universe across the unfiltered set, never the active filter's
// narrowed view, so this never takes a filter arg.
//
// Stats internally buckets by camelCase category names; the filter
// pill UI + FilterShape wire format use kebab-case (see
// PhotoModel.uniqueValues() and photo-filter-eval.ts). This method
// maps to the kebab-case shape the filter side expects, and adds the
// two categories stats doesn't bucket but the pills want — `year-
// month` (derived from `byYearMonth`'s keys) and `geotagged` (binary;
// surfaces both yes/no so the pill is always selectable).
export interface FilterValuesResponse {
  categoryValues: Record<string, string[]>;
  byCityLocalized: Record<string, string>;
}
const getGalleryFilterValues = async (
  galleryId: string,
  lang?: string
): Promise<FilterValuesResponse> => {
  const stats = await getGalleryStats(galleryId, undefined, lang);
  const cv = stats.categoryValues;
  const yearMonths: string[] = [];
  for (const [year, months] of Object.entries(stats.byYearMonth ?? {})) {
    for (const month of Object.keys(months)) {
      yearMonths.push(`${year}-${month}`);
    }
  }
  yearMonths.sort();
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
    byCityLocalized: stats.byCityLocalized,
  };
};

const getGlobalStats = async (
  filter?: FilterShape,
  lang?: string
): Promise<StatsResponse> => {
  const cacheable = isUnfilteredBase(filter);
  const key = globalCacheKey(lang);
  if (cacheable) {
    const cached = cacheGet<StatsResponse>(key);
    if (cached) return cached;
  }
  const photos = (await db.loadPhotos(lang)) as Photo[];
  const stats = computeStats(photos, filter);
  if (cacheable) cacheSet(key, stats);
  return stats;
};
