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
