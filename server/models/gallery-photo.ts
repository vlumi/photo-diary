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
    getGalleryPhotoNeighbors,
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

// Adjacent + boundary photos for the Photo modal's carousel +
// keyboard nav (#406). Loads the gallery's photos via the same
// SQL path, filters with the wire-shape evaluator, sorts by
// timestamp, and returns the photo objects the modal needs to
// render its prev / current / next slides plus the first / last
// jumps. All four fields optional — empty filter set, photo at
// boundary, or photo not in the filtered set each surface as a
// missing field rather than an error.
interface NeighborsOpts {
  filter?: FilterShape;
  lang?: string;
}
interface NeighborsResult {
  previous?: Photo;
  next?: Photo;
  first?: Photo;
  last?: Photo;
  position?: number;
  total: number;
}
const getGalleryPhotoNeighbors = async (
  galleryId: string,
  photoId: string,
  opts: NeighborsOpts = {}
): Promise<NeighborsResult> => {
  logger.debug("Getting gallery photo neighbors", { galleryId, photoId });
  const all = (await db.loadGalleryPhotos(galleryId, opts.lang)) as Photo[];
  const filtered = all
    .filter((p) => matchesFilter(opts.filter, p))
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
