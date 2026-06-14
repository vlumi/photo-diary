import logger from "../lib/logger.js";
import db from "../db/index.js";
import { ValidationError } from "../lib/errors.js";
import type {
  DateRange,
  FilterShape,
  NumericRanges,
} from "../lib/photo-filter-eval.js";
import {
  cacheGet,
  cacheSet,
  invalidateGallery,
  invalidateGlobal,
} from "../lib/stats-cache.js";
import type { FilterValuesResult } from "../db/index.js";

export default () => {
  return {
    init,
    getGalleryPhotos,
    queryGalleryPhotos,
    queryGalleryPhotoCounts,
    getGalleryPhotoNeighbors,
    getGalleryFilterValues,
    getGalleryPhoto,
    getGalleryPhotoByOriginalFilename,
    linkGalleryPhoto,
    unlinkGalleryPhoto,
    unlinkAllPhotos,
    unlinkAllGalleries,
  };
};

const init = async () => {};

const getGalleryPhotos = async (
  galleryId: string,
  lang?: string,
  includePrivate = false
) => {
  logger.debug("Getting photos from gallery", galleryId);
  return await db.loadGalleryPhotos(galleryId, lang, includePrivate);
};

// View-scoped + filtered fetch — backs the per-view fetch path the
// public gallery viewer migrates to in #406. Filter + scope eval
// lives in the driver (#529) so this stays a thin wrapper.
interface QueryOpts {
  filter?: FilterShape;
  dateRange?: DateRange;
  numericRanges?: NumericRanges;
  year?: number;
  month?: number;
  day?: number;
  lang?: string;
  includePrivate?: boolean;
}
const queryGalleryPhotos = async (galleryId: string, opts: QueryOpts = {}) => {
  logger.debug("Querying photos from gallery", { galleryId, opts });
  return await db.queryFilteredPhotos(galleryId, opts);
};

// Adjacent + boundary photos for the Photo modal's carousel +
// keyboard nav (#406). Driver does the filter + sort + index walk
// (#529) and returns the response shape the controller serializes.
interface NeighborsOpts {
  filter?: FilterShape;
  dateRange?: DateRange;
  numericRanges?: NumericRanges;
  lang?: string;
  includePrivate?: boolean;
}
const getGalleryPhotoNeighbors = async (
  galleryId: string,
  photoId: string,
  opts: NeighborsOpts = {}
) => {
  logger.debug("Getting gallery photo neighbors", { galleryId, photoId });
  return await db.queryFilteredPhotoNeighbors(galleryId, photoId, opts);
};

// Per-day photo counts for the Year heatmap. Returns
// `{ "YYYY-MM-DD": count }` over the filtered + (optionally
// year-scoped) photo set. Driver owns the aggregation (#529).
interface CountsOpts {
  filter?: FilterShape;
  dateRange?: DateRange;
  numericRanges?: NumericRanges;
  year?: number;
  includePrivate?: boolean;
}
const queryGalleryPhotoCounts = async (
  galleryId: string,
  opts: CountsOpts = {}
) => {
  logger.debug("Querying photo counts from gallery", { galleryId, opts });
  return await db.queryFilteredPhotoCounts(galleryId, opts);
};
// Filter pill universe + city localized-label map (#534). The
// driver owns the compute; this layer adds a one-key cache per
// (gallery, lang) sharing the existing stats-cache machinery
// (invalidateGallery sweeps `<galleryId>:*`, so the `:fv:`
// entries get cleaned up on photo writes alongside the stats
// entries).
// `includePrivate` joins the cache key so a public viewer can't be
// served a private viewer's universe (or vice versa). The two
// suffixes are an explicit `:pub` / `:priv` rather than relying on
// presence/absence so any future caller mistake reads obvious.
const filterValuesCacheKey = (
  galleryId: string,
  lang: string | undefined,
  includePrivate: boolean
): string => {
  const scope = includePrivate ? "priv" : "pub";
  return !lang || lang === "en"
    ? `${galleryId}:fv:${scope}`
    : `${galleryId}:fv:${scope}:${lang}`;
};
const getGalleryFilterValues = async (
  galleryId: string,
  lang?: string,
  filter?: FilterShape,
  dateRange?: DateRange,
  numericRanges?: NumericRanges,
  includePrivate = false
): Promise<FilterValuesResult> => {
  const noFilter = !filter || Object.keys(filter).length === 0;
  const noDateRange =
    !dateRange || (!dateRange.from && !dateRange.to);
  const noNumericRanges =
    !numericRanges || Object.keys(numericRanges).length === 0;
  // Only the unfiltered universe (the cold-start view) hits the
  // shared stats cache; filter-aware queries change per toggle and
  // would churn the cache otherwise.
  if (noFilter && noDateRange && noNumericRanges) {
    const key = filterValuesCacheKey(galleryId, lang, includePrivate);
    const cached = cacheGet<FilterValuesResult>(key);
    if (cached) return cached;
    logger.debug("Computing filter values for gallery", { galleryId, lang });
    const result = await db.queryGalleryFilterValues(
      galleryId,
      lang,
      undefined,
      undefined,
      undefined,
      includePrivate
    );
    cacheSet(key, result);
    return result;
  }
  logger.debug("Computing filter values for gallery", {
    galleryId,
    lang,
    filtered: true,
  });
  return await db.queryGalleryFilterValues(
    galleryId,
    lang,
    filter,
    dateRange,
    numericRanges,
    includePrivate
  );
};

const getGalleryPhoto = async (
  galleryId: string,
  photoId: string,
  lang?: string,
  includePrivate = false
) => {
  logger.debug("Getting photo", photoId, "from gallery", galleryId);
  return await db.loadGalleryPhoto(galleryId, photoId, lang, includePrivate);
};
const getGalleryPhotoByOriginalFilename = async (
  galleryId: string,
  originalFilename: string,
  lang?: string,
  includePrivate = false
) => {
  logger.debug(
    "Getting photo by original filename",
    originalFilename,
    "from gallery",
    galleryId
  );
  return await db.loadGalleryPhotoByOriginalFilename(
    galleryId,
    originalFilename,
    lang,
    includePrivate
  );
};
// Virtual galleries are read-only (#22): membership is computed
// live from the source galleries, so direct link/unlink ops on
// the virtual id have no `gallery_photo` row to touch and would
// silently no-op. Reject so the operator sees the structural
// issue rather than a confusing "nothing happened".
const rejectIfVirtual = async (
  galleryId: string,
  op: string
): Promise<void> => {
  if (await db.isVirtualGallery(galleryId)) {
    throw new ValidationError(
      `Cannot ${op} on a virtual gallery; modify a source gallery instead`,
      { galleryId }
    );
  }
};
// Gallery membership changes shift the global stats' `byGallery`
// counts too (#446), so link / unlink invalidate both scopes.
const linkGalleryPhoto = async (galleryId: string, photoId: string) => {
  await rejectIfVirtual(galleryId, "link a photo");
  logger.debug("Linking photo", photoId, "to gallery", galleryId);
  const result = await db.linkGalleryPhoto([galleryId], [photoId]);
  invalidateGallery(galleryId);
  invalidateGlobal();
  return result;
};
const unlinkGalleryPhoto = async (galleryId: string, photoId: string) => {
  await rejectIfVirtual(galleryId, "unlink a photo");
  logger.debug("Unlinking photo", photoId, "from gallery", galleryId);
  const result = await db.unlinkGalleryPhoto(galleryId, photoId);
  invalidateGallery(galleryId);
  invalidateGlobal();
  return result;
};
const unlinkAllPhotos = async (galleryId: string) => {
  await rejectIfVirtual(galleryId, "unlink all photos");
  logger.debug("Unlinking all photos from gallery", galleryId);
  const result = await db.unlinkAllPhotos(galleryId);
  invalidateGallery(galleryId);
  invalidateGlobal();
  return result;
};
const unlinkAllGalleries = async (photoId: string) => {
  logger.debug("Unlinking photo", photoId, "from all galleries");
  // Resolve affected galleries BEFORE the cascade removes the links.
  const links = (await db.loadAllGalleryPhotoLinks()) as Array<{
    photoId: string;
    galleryId: string;
  }>;
  const galleries = links
    .filter((l) => l.photoId === photoId)
    .map((l) => l.galleryId);
  const result = await db.unlinkAllGalleries(photoId);
  for (const galleryId of galleries) invalidateGallery(galleryId);
  invalidateGlobal();
  return result;
};
