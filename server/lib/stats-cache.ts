// In-process cache for the unfiltered stats response, keyed by
// gallery id. Per #286: the unfiltered base is by far the most
// common request (it's what every Stats landing view fetches);
// filtered combinations skip the cache and compute on demand.
//
// Entries expire after `CACHE_TTL_MS` so out-of-band mutations
// (CLI tools running against the same DB, e.g. `bin/photo.ts`)
// can't pin a stale cache indefinitely. The explicit invalidation
// hooks below cover in-process mutations precisely.

import logger from "./logger.js";

const CACHE_TTL_MS = 5 * 60 * 1000;

interface CacheEntry<T> {
  value: T;
  storedAt: number;
}

const cache = new Map<string, CacheEntry<unknown>>();

export const cacheGet = <T>(key: string): T | undefined => {
  const entry = cache.get(key);
  if (!entry) return undefined;
  if (Date.now() - entry.storedAt > CACHE_TTL_MS) {
    cache.delete(key);
    return undefined;
  }
  return entry.value as T;
};

export const cacheSet = <T>(key: string, value: T): void => {
  cache.set(key, { value, storedAt: Date.now() });
};

// Gallery-scoped invalidation. Drops every cache entry whose key
// matches `<galleryId>` or `<galleryId>:<lang>` — a multi-lang
// instance accumulates separate cached responses per lang and
// they all need to go on the same mutation.
export const invalidateGallery = (galleryId: string): void => {
  const prefix = `${galleryId}:`;
  let dropped = 0;
  for (const key of cache.keys()) {
    if (key === galleryId || key.startsWith(prefix)) {
      cache.delete(key);
      dropped++;
    }
  }
  if (dropped > 0) {
    logger.debug("Stats cache: invalidated gallery", { galleryId, dropped });
  }
};

// Global namespace invalidation. Drops every `:global` / `:global:lang`
// entry. Photo writes call both this and `invalidateGallery` for the
// linked galleries, since a single photo change shifts both views.
export const invalidateGlobal = (): void => {
  const prefix = ":global";
  let dropped = 0;
  for (const key of cache.keys()) {
    if (key === prefix || key.startsWith(`${prefix}:`)) {
      cache.delete(key);
      dropped++;
    }
  }
  if (dropped > 0) {
    logger.debug("Stats cache: invalidated global", { dropped });
  }
};

export const invalidateAllGalleries = (): void => {
  if (cache.size > 0) {
    logger.debug("Stats cache: cleared", { count: cache.size });
    cache.clear();
  }
};

// Test-only seam (matches the `_resetForTests` pattern). The cache
// is process-local; vitest test files share a worker so a previous
// test's cached value can leak across `beforeEach`.
export const _resetForTests = (): void => {
  cache.clear();
};
