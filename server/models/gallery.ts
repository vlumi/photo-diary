/* eslint-disable @typescript-eslint/no-explicit-any */
import logger from "../lib/logger.js";
import db from "../db/index.js";
import { NotFoundError, ValidationError } from "../lib/errors.js";
import {
  removeGalleryIcon,
  writeGalleryIcon,
  type CropPixels,
} from "../lib/gallery-icon.js";
import { assertSlugId } from "../lib/id-shape.js";
import { invalidateGallery, invalidateGlobal } from "../lib/stats-cache.js";

export default () => {
  return {
    init,
    getGalleries,
    createGallery,
    getGallery,
    updateGallery,
    deleteGallery,
    setGalleryIcon,
    setGalleryOrder,
  };
};

const init = async () => {};

const getGalleries = async () => {
  logger.debug("Getting all galleries");
  return await db.loadGalleries();
};
// Validate a virtual gallery's source list: each id must
// reference a real gallery (no self-reference, no other virtual
// galleries — design decision #4 sidesteps cycle detection).
const validateSources = async (
  galleryId: string,
  sources: string[]
): Promise<void> => {
  const seen = new Set<string>();
  for (const sourceId of sources) {
    if (sourceId === galleryId) {
      throw new ValidationError(
        "Virtual gallery source cannot reference itself",
        { galleryId, sourceId }
      );
    }
    if (seen.has(sourceId)) {
      throw new ValidationError(
        "Duplicate source in virtual gallery",
        { galleryId, sourceId }
      );
    }
    seen.add(sourceId);
    try {
      await db.loadGallery(sourceId);
    } catch (err) {
      if (err instanceof NotFoundError) {
        throw new ValidationError(
          "Virtual gallery source does not exist",
          { galleryId, sourceId }
        );
      }
      throw err;
    }
    if (await db.isVirtualGallery(sourceId)) {
      throw new ValidationError(
        "Virtual gallery cannot reference another virtual gallery",
        { galleryId, sourceId }
      );
    }
  }
};
// Apply / clear / update the virtual_gallery row for `galleryId`.
// `sources` undefined → no-op (real gallery, no change). Empty
// array → delete row (turns virtual back into real). Non-empty →
// validate + upsert.
const applyVirtualSources = async (
  galleryId: string,
  sources: string[] | undefined
): Promise<void> => {
  if (sources === undefined) return;
  if (sources.length === 0) {
    await db.deleteVirtualGallery(galleryId);
  } else {
    await validateSources(galleryId, sources);
    // Preserve the "no chained virtuals" invariant at *transition*
    // time, not just at create time: if galleryId is
    // already referenced as a source by some virtual gallery,
    // turning it virtual now would silently break that referrer
    // (resolveGallerySources doesn't recurse, so the referrer
    // would resolve to an empty photo set). The referrer side is
    // already protected by validateSources's `isVirtualGallery`
    // check; this is the converse — block the transition that
    // would make an existing referrer's source virtual.
    if (await db.isReferencedAsSource(galleryId)) {
      throw new ValidationError(
        "Cannot convert a gallery to virtual while it is a source of another virtual gallery",
        { galleryId }
      );
    }
    await db.upsertVirtualGallery(galleryId, sources);
  }
};
const createGallery = async (gallery: { id: string } & Record<string, any>) => {
  assertSlugId(gallery.id);
  logger.debug("Creating gallery", { id: gallery.id });
  // Seed the gallery's primary language from the instance-level
  // `defaultLanguage` meta row when the caller didn't specify one,
  // with `en` as the final fallback.
  if (!gallery.defaultLanguage) {
    const metas = await db.loadMetas();
    gallery.defaultLanguage = metas.instance_defaultLanguage || "en";
  }
  const sources = gallery.sources as string[] | undefined;
  await db.createGallery(gallery);
  await applyVirtualSources(gallery.id, sources);
};
const getGallery = async (galleryId: string, includePrivate = false) => {
  logger.debug("Getting gallery", galleryId);
  const gallery = await db.loadGallery(galleryId);
  const galleryPhotos = await db.loadGalleryPhotos(
    galleryId,
    undefined,
    includePrivate
  );
  return {
    ...gallery,
    photos: galleryPhotos,
  };
};
const updateGallery = async (
  galleryId: string,
  patch: Record<string, any>
) => {
  logger.debug("Updating gallery", { id: galleryId });
  // `defaultLanguage` changes just flip the column. No data is
  // moved between canonical and the gallery_localized overlays:
  // the operator does any content rotation manually (e.g. swap
  // title strings between canonical and the overlay rows). The
  // UI labels the canonical input with the active default so the
  // operator can see what they're editing.
  await db.updateGallery(galleryId, patch);
  if ("sources" in patch) {
    await applyVirtualSources(galleryId, patch.sources as string[] | undefined);
    // Virtual gallery contents shift = stats caches go stale.
    invalidateGallery(galleryId);
    invalidateGlobal();
  }
};
// Cascade: unlink every gallery_photo link (real galleries only;
// virtual galleries have none) and every user_gallery row for this
// gallery before deleting it. virtual_gallery row drops via the
// schema's ON DELETE CASCADE.
const deleteGallery = async (galleryId: string) => {
  logger.debug("Deleting gallery", galleryId);
  if (!(await db.isVirtualGallery(galleryId))) {
    await db.unlinkAllPhotos(galleryId);
  }
  const accessRows = (await db.loadUserGalleryRows({ galleryId })) as Array<{
    user_id: string;
    gallery_id: string;
  }>;
  for (const row of accessRows) {
    await db.deleteUserGallery(row.user_id, row.gallery_id);
  }
  await db.deleteGallery(galleryId);
  await removeGalleryIcon(galleryId);
  invalidateGallery(galleryId);
};

// Crop the source photo's display variant + write the icon file,
// then update the gallery row's icon column to point at it.
// Stores `icon_source` JSON alongside so the editor can re-open the
// cropper against the same source + crop rect.
const setGalleryIcon = async (
  galleryId: string,
  sourcePhotoId: string,
  crop: CropPixels,
  sourceMaxDim: number
) => {
  logger.debug("Setting gallery icon", {
    galleryId,
    sourcePhotoId,
    sourceMaxDim,
  });
  const iconPath = await writeGalleryIcon(
    galleryId,
    sourcePhotoId,
    crop,
    sourceMaxDim
  );
  const iconSource = JSON.stringify({
    photoId: sourcePhotoId,
    sourceMaxDim,
    crop,
  });
  await db.updateGallery(galleryId, { icon: iconPath, iconSource });
  return iconPath;
};

// Apply an operator-curated order across every visible gallery.
// The input must contain exactly the current gallery id set — no
// missing ids (would leave them stranded at ordinal 0) and no extras
// (typo / stale client). Ordinals are reassigned by position: 0, 1,
// 2, … so the operator's drop-on-row gets the literal slot they
// picked.
const setGalleryOrder = async (ids: string[]): Promise<void> => {
  logger.debug("Reordering galleries", { count: ids.length });
  const galleries = (await db.loadGalleries()) as Array<{ id: string }>;
  const existing = new Set(galleries.map((g) => g.id));
  const seen = new Set<string>();
  for (const id of ids) {
    if (!existing.has(id)) {
      throw new ValidationError("Unknown gallery id in order list", { id });
    }
    if (seen.has(id)) {
      throw new ValidationError("Duplicate gallery id in order list", { id });
    }
    seen.add(id);
  }
  if (seen.size !== existing.size) {
    const missing = [...existing].filter((id) => !seen.has(id));
    throw new ValidationError(
      "Order list must include every gallery exactly once",
      { missing }
    );
  }
  await db.setGalleryOrder(ids);
};
