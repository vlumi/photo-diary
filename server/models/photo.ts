/* eslint-disable @typescript-eslint/no-explicit-any */
import logger from "../lib/logger.js";
import db from "../db/index.js";
import {
  applyFilter,
  MISSING_PREDICATES,
  paginate,
  sortByTakenDesc,
  type MissingField,
  type PhotoFilter,
} from "../lib/photo-filter.js";

export default () => {
  return {
    init,
    getPhotos,
    listPhotos,
    countAudits,
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
  // When set, the response page is the one containing this photo
  // in the sorted filtered set (1-based). Overrides `page`. Used
  // by the admin photos view to land the operator on the right
  // page when deep-linking to a specific photo. Silently ignored
  // when the photo isn't in the filtered set.
  photoIdFocus?: string;
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
  let effectivePage = page;
  if (opts.photoIdFocus) {
    const idx = sorted.findIndex((p) => p.id === opts.photoIdFocus);
    if (idx >= 0) effectivePage = Math.floor(idx / pageSize) + 1;
  }
  const result = paginate(sorted, effectivePage, pageSize);
  const decorated = result.items.map((p) => ({
    ...p,
    galleries: Array.from(galleryMembers.get(p.id) ?? []),
  }));
  return {
    photos: decorated,
    page: result.page,
    pageSize: result.pageSize,
    total: result.total,
  };
};

// Per-predicate audit counts over the catalogue. Each key matches
// the filter-chip URL param on the admin photos page (`orphan=1`,
// `duplicates=1`, `countryMismatch=1`, `missing=<field>`), so a
// dashboard tile can deep-link to `/m/photos?<key>=…` and the
// Photos page parses it straight into the active filter.
const MISSING_FIELDS: MissingField[] = [
  "taken",
  "coords",
  "place",
  "country",
  "author",
  "title",
  "description",
  "state-code",
];

export interface AuditCounts {
  orphan: number;
  duplicates: number;
  countryMismatch: number;
  missing: Record<MissingField, number>;
}

const countAudits = async (opts: {
  restrictToIds?: Set<string>;
} = {}): Promise<AuditCounts> => {
  logger.debug("Counting audits", { scoped: !!opts.restrictToIds });
  const allPhotos = toArray(await db.loadPhotos());
  const orphanIds = new Set<string>(await db.loadOrphanPhotoIds());
  const photos = opts.restrictToIds
    ? allPhotos.filter((p) => opts.restrictToIds!.has(p.id))
    : allPhotos;
  // duplicatesPredicate over the in-scope subset only — duplicates
  // across scope boundaries shouldn't bleed into a scoped count.
  const dupeCounts = new Map<string, number>();
  for (const p of photos) {
    const name = p.originalFilename as string | undefined;
    if (!name) continue;
    dupeCounts.set(name, (dupeCounts.get(name) ?? 0) + 1);
  }
  const isDupe = (p: any): boolean => {
    const name = p.originalFilename as string | undefined;
    return !!name && (dupeCounts.get(name) ?? 0) > 1;
  };
  const isCountryMismatch = (p: any): boolean => {
    const op = p.taken?.location?.country;
    const geo = p.geocoded?.countryCode;
    if (!op || !geo) return false;
    return String(op).toLowerCase() !== String(geo).toLowerCase();
  };
  const missing = Object.fromEntries(
    MISSING_FIELDS.map((f) => [f, 0])
  ) as Record<MissingField, number>;
  let orphan = 0;
  let duplicates = 0;
  let countryMismatch = 0;
  for (const p of photos) {
    if (orphanIds.has(p.id)) orphan++;
    if (isDupe(p)) duplicates++;
    if (isCountryMismatch(p)) countryMismatch++;
    for (const f of MISSING_FIELDS) {
      if (MISSING_PREDICATES[f](p)) missing[f]++;
    }
  }
  return { orphan, duplicates, countryMismatch, missing };
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
