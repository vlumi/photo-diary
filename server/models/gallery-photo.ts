import logger from "../lib/logger.js";
import db from "../db/index.js";
import {
  matchesFilter,
  type FilterShape,
} from "../lib/photo-filter-eval.js";
import type { Photo } from "../db/sqlite3/schema.js";
import { invalidateGallery } from "../lib/stats-cache.js";

export default () => {
  return {
    init,
    getGalleryPhotos,
    queryGalleryPhotos,
    queryGalleryPhotoCounts,
    getGalleryPhoto,
    linkGalleryPhoto,
    unlinkGalleryPhoto,
    unlinkAllPhotos,
    unlinkAllGalleries,
  };
};

const init = async () => {};

const getGalleryPhotos = async (galleryId: string, lang?: string) => {
  logger.debug("Getting photos from gallery", galleryId);
  return await db.loadGalleryPhotos(galleryId, lang);
};

// View-scoped + filtered fetch — backs the per-view fetch path
// the public gallery viewer migrates to in #406. Server loads the
// gallery's photos via the same SQL path as `getGalleryPhotos`,
// then applies the filter evaluator and an optional year/month/day
// scope on the result. Same auth context as the unfiltered fetch.
interface QueryOpts {
  filter?: FilterShape;
  year?: number;
  month?: number;
  day?: number;
  lang?: string;
}
const matchesScope = (photo: Photo, opts: QueryOpts): boolean => {
  const instant = photo.taken.instant;
  if (opts.year !== undefined && instant.year !== opts.year) return false;
  if (opts.month !== undefined && instant.month !== opts.month) return false;
  if (opts.day !== undefined && instant.day !== opts.day) return false;
  return true;
};
const queryGalleryPhotos = async (
  galleryId: string,
  opts: QueryOpts = {}
): Promise<Photo[]> => {
  logger.debug("Querying photos from gallery", { galleryId, opts });
  const photos = (await db.loadGalleryPhotos(galleryId, opts.lang)) as Photo[];
  return photos.filter(
    (photo) => matchesScope(photo, opts) && matchesFilter(opts.filter, photo)
  );
};

// Per-day photo counts for the Year heatmap. Returns
// `{ "YYYY-MM-DD": count }` over the filtered + (optionally
// year-scoped) photo set. Same auth as the unfiltered fetch;
// the caller is just asking for a histogram instead of the rows
// themselves.
interface CountsOpts {
  filter?: FilterShape;
  year?: number;
}
const queryGalleryPhotoCounts = async (
  galleryId: string,
  opts: CountsOpts = {}
): Promise<Record<string, number>> => {
  logger.debug("Querying photo counts from gallery", { galleryId, opts });
  const photos = (await db.loadGalleryPhotos(galleryId)) as Photo[];
  const out: Record<string, number> = {};
  for (const photo of photos) {
    const instant = photo.taken.instant;
    if (opts.year !== undefined && instant.year !== opts.year) continue;
    if (!matchesFilter(opts.filter, photo)) continue;
    const key = `${instant.year}-${String(instant.month).padStart(
      2,
      "0"
    )}-${String(instant.day).padStart(2, "0")}`;
    out[key] = (out[key] ?? 0) + 1;
  }
  return out;
};
const getGalleryPhoto = async (
  galleryId: string,
  photoId: string,
  lang?: string
) => {
  logger.debug("Getting photo", photoId, "from gallery", galleryId);
  return await db.loadGalleryPhoto(galleryId, photoId, lang);
};
const linkGalleryPhoto = async (galleryId: string, photoId: string) => {
  logger.debug("Linking photo", photoId, "to gallery", galleryId);
  const result = await db.linkGalleryPhoto([galleryId], [photoId]);
  invalidateGallery(galleryId);
  return result;
};
const unlinkGalleryPhoto = async (galleryId: string, photoId: string) => {
  logger.debug("Unlinking photo", photoId, "from gallery", galleryId);
  const result = await db.unlinkGalleryPhoto(galleryId, photoId);
  invalidateGallery(galleryId);
  return result;
};
const unlinkAllPhotos = async (galleryId: string) => {
  logger.debug("Unlinking all photos from gallery", galleryId);
  const result = await db.unlinkAllPhotos(galleryId);
  invalidateGallery(galleryId);
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
  return result;
};
