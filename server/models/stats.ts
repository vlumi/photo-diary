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
  computeStats,
  isUnfilteredBase,
  type StatsResponse,
} from "../lib/stats-compute.js";
import type { FilterShape } from "../lib/photo-filter-eval.js";

export default () => ({
  getGalleryStats,
  getGlobalStats,
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

// Global filter pill universe — cross-gallery flavour of the
// gallery-scoped getGalleryFilterValues (#534). Drives the
// `<GlobalStats>` filter sidebar without that page having to load
// the entire photo array client-side. Cached under the same
// `:global` namespace stats uses; photo writes that call
// `invalidateGlobal()` sweep this entry alongside the stats one.
const globalFilterValuesCacheKey = (lang?: string): string =>
  !lang || lang === "en" ? ":global:fv" : `:global:fv:${lang}`;
const getGlobalFilterValues = async (
  lang?: string
): Promise<FilterValuesResult> => {
  const key = globalFilterValuesCacheKey(lang);
  const cached = cacheGet<FilterValuesResult>(key);
  if (cached) return cached;
  const result = await db.queryGlobalFilterValues(lang);
  cacheSet(key, result);
  return result;
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
  const [photos, links] = await Promise.all([
    db.loadPhotos(lang) as Promise<Photo[]>,
    db.loadAllGalleryPhotoLinks() as Promise<
      Array<{ photoId: string; galleryId: string }>
    >,
  ]);
  // Attach gallery membership so computeStats can produce
  // byGallery (#446). Single pass over the link table builds the
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
  const stats = computeStats(decorated, filter);
  if (cacheable) cacheSet(key, stats);
  return stats;
};
