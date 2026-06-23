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
import type { FilterValuesResult } from "../db/index.js";
import type { Photo } from "../db/sqlite3/schema.js";
import { cacheGet, cacheSet } from "../lib/stats-cache.js";
import {
  buildEvolution,
  computeStats,
  isUnfilteredBase,
  type EvolutionResult,
  type StatsResponse,
} from "../lib/stats-compute.js";
import {
  matchesDateRange,
  matchesNumericRanges,
  type DateRange,
  type FilterShape,
  type NumericRanges,
} from "../lib/photo-filter-eval.js";

// Date-range bypass-cache check sibling to `isUnfilteredBase`.
// Either bound present → dateRange is constraining; treat the
// request as filtered so cached unfiltered results don't shadow it.
const isDateRangeUnbounded = (range?: DateRange): boolean =>
  !range || (!range.from && !range.to);
const isNumericRangesUnbounded = (ranges?: NumericRanges): boolean =>
  !ranges || Object.keys(ranges).length === 0;

export default () => ({
  getGalleryStats,
  getGalleryEvolution,
  getGlobalStats,
  getGlobalEvolution,
  getGlobalFilterValues,
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
// `includePrivate` joins the cache key so a private-view viewer
// never inherits a public-only cached aggregate (or vice versa).
const galleryCacheKey = (
  galleryId: string,
  lang: string | undefined,
  includePrivate: boolean
): string => {
  const scope = includePrivate ? "priv" : "pub";
  return !lang || lang === "en"
    ? `${galleryId}:${scope}`
    : `${galleryId}:${scope}:${lang}`;
};

// Distinct namespace so a gallery named "global" can't collide
// with the cross-gallery cache. Hostnames can't carry colons
// (gallery ids are slug-shaped) so the prefix is collision-free.
const globalCacheKey = (lang?: string): string =>
  !lang || lang === "en" ? ":global" : `:global:${lang}`;

const getGalleryStats = async (
  galleryId: string,
  filter?: FilterShape,
  lang?: string,
  dateRange?: DateRange,
  numericRanges?: NumericRanges,
  includePrivate = false
): Promise<StatsResponse> => {
  const cacheable =
    isUnfilteredBase(filter) &&
    isDateRangeUnbounded(dateRange) &&
    isNumericRangesUnbounded(numericRanges);
  const key = galleryCacheKey(galleryId, lang, includePrivate);
  if (cacheable) {
    const cached = cacheGet<StatsResponse>(key);
    if (cached) return cached;
  }
  const loaded = (await db.loadGalleryPhotos(
    galleryId,
    lang,
    includePrivate
  )) as Photo[];
  // Pre-filter by date range + numeric ranges so `computeStats`
  // stays a pure FilterShape evaluator — keeps the range filters
  // local to model / driver layers rather than threading into every
  // aggregator.
  const photos =
    isDateRangeUnbounded(dateRange) && isNumericRangesUnbounded(numericRanges)
      ? loaded
      : loaded.filter(
        (p) =>
          matchesDateRange(dateRange, p) &&
            matchesNumericRanges(numericRanges, p)
      );
  const stats = computeStats(photos, filter);
  if (cacheable) cacheSet(key, stats);
  return stats;
};

// Per-bucket time-series for the trend chart. Lazy on
// the client — only fires when the user opens the modal for a
// trendable category. No cache layer yet; the compute is one
// photo walk + one fan-out, fast at current scale.
const getGalleryEvolution = async (
  galleryId: string,
  category: string,
  filter?: FilterShape,
  lang?: string,
  dateRange?: DateRange,
  numericRanges?: NumericRanges,
  includePrivate = false
): Promise<EvolutionResult> => {
  const loaded = (await db.loadGalleryPhotos(
    galleryId,
    lang,
    includePrivate
  )) as Photo[];
  const photos =
    isDateRangeUnbounded(dateRange) && isNumericRangesUnbounded(numericRanges)
      ? loaded
      : loaded.filter(
        (p) =>
          matchesDateRange(dateRange, p) &&
            matchesNumericRanges(numericRanges, p)
      );
  return buildEvolution(photos, category, filter);
};

// Global filter pill universe — cross-gallery flavour of the
// gallery-scoped getGalleryFilterValues. Drives the
// `<GlobalStats>` filter sidebar without that page having to load
// the entire photo array client-side. Cached under the same
// `:global` namespace stats uses; photo writes that call
// `invalidateGlobal()` sweep this entry alongside the stats one.
const globalFilterValuesCacheKey = (lang?: string): string =>
  !lang || lang === "en" ? ":global:fv" : `:global:fv:${lang}`;
const getGlobalFilterValues = async (
  lang?: string,
  filter?: FilterShape,
  dateRange?: DateRange,
  numericRanges?: NumericRanges
): Promise<FilterValuesResult> => {
  if (
    isUnfilteredBase(filter) &&
    isDateRangeUnbounded(dateRange) &&
    isNumericRangesUnbounded(numericRanges)
  ) {
    const key = globalFilterValuesCacheKey(lang);
    const cached = cacheGet<FilterValuesResult>(key);
    if (cached) return cached;
    const result = await db.queryGlobalFilterValues(lang);
    cacheSet(key, result);
    return result;
  }
  return await db.queryGlobalFilterValues(
    lang,
    filter,
    dateRange,
    numericRanges
  );
};

const getGlobalEvolution = async (
  category: string,
  filter?: FilterShape,
  lang?: string,
  dateRange?: DateRange,
  numericRanges?: NumericRanges
): Promise<EvolutionResult> => {
  const loaded = (await db.loadPhotos(lang)) as Photo[];
  const photos =
    isDateRangeUnbounded(dateRange) && isNumericRangesUnbounded(numericRanges)
      ? loaded
      : loaded.filter(
        (p) =>
          matchesDateRange(dateRange, p) &&
            matchesNumericRanges(numericRanges, p)
      );
  return buildEvolution(photos, category, filter);
};

const getGlobalStats = async (
  filter?: FilterShape,
  lang?: string,
  dateRange?: DateRange,
  numericRanges?: NumericRanges
): Promise<StatsResponse> => {
  const cacheable =
    isUnfilteredBase(filter) &&
    isDateRangeUnbounded(dateRange) &&
    isNumericRangesUnbounded(numericRanges);
  const key = globalCacheKey(lang);
  if (cacheable) {
    const cached = cacheGet<StatsResponse>(key);
    if (cached) return cached;
  }
  const [photos, links] = await Promise.all([
    db.loadPhotos(lang) as Promise<Photo[]>,
    db.loadAllGalleryPhotoLinks() as Promise<
      Array<{ photoId: string; galleryId: string }>
    >,
  ]);
  // Attach gallery membership so computeStats can produce
  // byGallery. Single pass over the link table builds the
  // photoId → galleryIds map, then each photo gets its slice.
  const galleriesByPhoto = new Map<string, string[]>();
  for (const link of links) {
    const list = galleriesByPhoto.get(link.photoId);
    if (list) {
      list.push(link.galleryId);
    } else {
      galleriesByPhoto.set(link.photoId, [link.galleryId]);
    }
  }
  const decorated = photos.map((p) => ({
    ...p,
    galleries: galleriesByPhoto.get(p.id) ?? [],
  })) as Photo[];
  const ranged =
    isDateRangeUnbounded(dateRange) && isNumericRangesUnbounded(numericRanges)
      ? decorated
      : decorated.filter(
        (p) =>
          matchesDateRange(dateRange, p) &&
            matchesNumericRanges(numericRanges, p)
      );
  const stats = computeStats(ranged, filter);
  if (cacheable) cacheSet(key, stats);
  return stats;
};
