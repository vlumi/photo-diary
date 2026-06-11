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
  };
};

const init = async () => {};

const getGalleries = async () => {
  logger.debug("Getting all galleries");
  return await db.loadGalleries();
};
// Validate a virtual gallery's source list (#22): each id must
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
    // Preserve #22's design decision #4 (no chained virtuals) at
    // *transition* time, not just at create time: if galleryId is
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
  // Default the gallery's primary language from `.env DEFAULT_LANGUAGE`
  // when the caller didn't specify one — operator's preference at the
  // instance level becomes the seed for every new gallery, with `en`
  // as the final fallback. Existing galleries opt in by setting their
  // own value through the admin UI / API.
  if (!gallery.defaultLanguage) {
    gallery.defaultLanguage = process.env.DEFAULT_LANGUAGE || "en";
  }
  const sources = gallery.sources as string[] | undefined;
  await db.createGallery(gallery);
  await applyVirtualSources(gallery.id, sources);
};
const getGallery = async (galleryId: string) => {
  logger.debug("Getting gallery", galleryId);
  const gallery = await db.loadGallery(galleryId);
  const galleryPhotos = await db.loadGalleryPhotos(galleryId);
  return {
    ...gallery,
    photos: galleryPhotos,
  };
};
// Move localized content around when the operator switches the
// gallery's primary language so the canonical column always carries
// the new default's text. Shuffle (per field — title and description
// independent):
//   1. old canonical → old-default-language's overlay row
//   2. new default's overlay → new canonical
//   3. drop the new default's overlay row (now redundant)
//
// Reads from `existing` (pre-patch state) so the operator's
// in-flight edits in the same request don't compete with the
// shuffle: the patch wins for the OLD layout, then the shuffle
// reshapes for the NEW layout.
const shuffleDefaultLanguage = async (
  galleryId: string,
  oldDefault: string,
  newDefault: string,
  existing: { title?: string; description?: string }
): Promise<void> => {
  const current = (await db.loadGallery(galleryId)) as {
    title?: string;
    description?: string;
    titleLocalized?: Record<string, string>;
    descriptionLocalized?: Record<string, string>;
  };
  const newCanonicalTitle = current.titleLocalized?.[newDefault] ?? "";
  const newCanonicalDesc = current.descriptionLocalized?.[newDefault] ?? "";
  // Patch may have already updated canonical; prefer the live row
  // values so we capture whatever just landed.
  const oldCanonicalTitle = current.title ?? existing.title ?? "";
  const oldCanonicalDesc = current.description ?? existing.description ?? "";
  await db.updateGallery(galleryId, {
    title: newCanonicalTitle,
    description: newCanonicalDesc,
    titleLocalized: {
      [oldDefault]: oldCanonicalTitle,
      [newDefault]: "",
    },
    descriptionLocalized: {
      [oldDefault]: oldCanonicalDesc,
      [newDefault]: "",
    },
  });
};

const updateGallery = async (
  galleryId: string,
  patch: Record<string, any>
) => {
  logger.debug("Updating gallery", { id: galleryId });
  // Capture the pre-patch state so the default-language shuffle
  // (below) can find the old canonical even if the patch overwrites
  // it as part of the same request.
  let existing:
    | { defaultLanguage?: string; title?: string; description?: string }
    | undefined;
  if (patch.defaultLanguage) {
    existing = (await db.loadGallery(galleryId)) as typeof existing;
  }
  await db.updateGallery(galleryId, patch);
  if (
    existing &&
    patch.defaultLanguage &&
    patch.defaultLanguage !== existing.defaultLanguage
  ) {
    await shuffleDefaultLanguage(
      galleryId,
      existing.defaultLanguage ?? "en",
      patch.defaultLanguage,
      existing
    );
  }
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
  crop: CropPixels
) => {
  logger.debug("Setting gallery icon", { galleryId, sourcePhotoId });
  const iconPath = await writeGalleryIcon(galleryId, sourcePhotoId, crop);
  const iconSource = JSON.stringify({ photoId: sourcePhotoId, crop });
  await db.updateGallery(galleryId, { icon: iconPath, iconSource });
  return iconPath;
};
