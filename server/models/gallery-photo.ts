import logger from "../lib/logger.js";
import db from "../db/index.js";
import type { FilterShape } from "../lib/photo-filter-eval.js";
import { invalidateGallery } from "../lib/stats-cache.js";

export default () => {
  return {
    init,
    getGalleryPhotos,
    queryGalleryPhotos,
    queryGalleryPhotoCounts,
    getGalleryPhotoNeighbors,
    getGalleryPhoto,
    getGalleryPhotoByOriginalFilename,
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

// View-scoped + filtered fetch — backs the per-view fetch path the
// public gallery viewer migrates to in #406. Filter + scope eval
// lives in the driver (#529) so this stays a thin wrapper.
interface QueryOpts {
  filter?: FilterShape;
  year?: number;
  month?: number;
  day?: number;
  lang?: string;
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
  lang?: string;
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
  year?: number;
}
const queryGalleryPhotoCounts = async (
  galleryId: string,
  opts: CountsOpts = {}
) => {
  logger.debug("Querying photo counts from gallery", { galleryId, opts });
  return await db.queryFilteredPhotoCounts(galleryId, opts);
};
const getGalleryPhoto = async (
  galleryId: string,
  photoId: string,
  lang?: string
) => {
  logger.debug("Getting photo", photoId, "from gallery", galleryId);
  return await db.loadGalleryPhoto(galleryId, photoId, lang);
};
const getGalleryPhotoByOriginalFilename = async (
  galleryId: string,
  originalFilename: string,
  lang?: string
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
    lang
  );
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
