/* eslint-disable @typescript-eslint/no-explicit-any */
import logger from "../lib/logger.js";
import db from "../db/index.js";
import {
  applyFilter,
  paginate,
  sortByTakenDesc,
  type PhotoFilter,
} from "../lib/photo-filter.js";

export default () => {
  return {
    init,
    getPhotos,
    listPhotos,
    createPhoto,
    getPhoto,
    updatePhoto,
    deletePhoto,
  };
};

const init = async () => {};

const getPhotos = async () => {
  logger.debug("Getting all photos");
  return await db.loadPhotos();
};

// Filtered + paginated list. Loads every row and applies predicates in
// memory — fine at current catalogue sizes; SQL-side optimisation is
// deferred (#286 / #406).
export interface ListOptions {
  filter?: PhotoFilter;
  page?: number;
  pageSize?: number;
  // Additional id allow-list applied alongside the filter. The
  // virtual-host scope (#386) passes its in-scope photo set here so
  // pagination still produces a correctly-sized window.
  restrictToIds?: Set<string>;
}

export interface ListResult {
  photos: any[];
  page: number;
  pageSize: number;
  total: number;
}

const DEFAULT_PAGE_SIZE = 100;
const MAX_PAGE_SIZE = 500;

const toArray = (photos: unknown): any[] =>
  Array.isArray(photos)
    ? (photos as any[])
    : (Object.values(photos as Record<string, any>) as any[]);

const listPhotos = async (opts: ListOptions = {}): Promise<ListResult> => {
  const filter = opts.filter ?? {};
  const page = Math.max(1, Math.floor(opts.page ?? 1));
  const pageSize = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, Math.floor(opts.pageSize ?? DEFAULT_PAGE_SIZE))
  );
  logger.debug("Listing photos", { filter, page, pageSize });

  const photos = toArray(await db.loadPhotos());
  const orphanIds = new Set<string>(await db.loadOrphanPhotoIds());
  const links = await db.loadAllGalleryPhotoLinks();
  const galleryMembers = new Map<string, Set<string>>();
  for (const link of links) {
    let set = galleryMembers.get(link.photoId);
    if (!set) {
      set = new Set();
      galleryMembers.set(link.photoId, set);
    }
    set.add(link.galleryId);
  }

  let matched = applyFilter(photos, filter, { galleryMembers, orphanIds });
  if (opts.restrictToIds) {
    const allow = opts.restrictToIds;
    matched = matched.filter((p) => allow.has(p.id));
  }
  const sorted = sortByTakenDesc(matched);
  const result = paginate(sorted, page, pageSize);
  return {
    photos: result.items,
    page: result.page,
    pageSize: result.pageSize,
    total: result.total,
  };
};

const createPhoto = async (photo: { id: string } & Record<string, any>) => {
  logger.debug("Creating photo", { id: photo.id });
  await db.createPhoto(photo);
};

const getPhoto = async (photoId: string) => {
  logger.debug("Getting photo", photoId);
  return await db.loadPhoto(photoId);
};

const updatePhoto = async (
  photoId: string,
  patch: Record<string, any>
) => {
  logger.debug("Updating photo", { id: photoId });
  await db.updatePhoto(photoId, patch);
};

// Cascade `gallery_photo` links before the row delete so the FK
// RESTRICT doesn't refuse. `photo_localized` cascades automatically
// via FK ON DELETE CASCADE.
const deletePhoto = async (photoId: string) => {
  logger.debug("Deleting photo", photoId);
  await db.unlinkAllGalleries(photoId);
  await db.deletePhoto(photoId);
};
