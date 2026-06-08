/* eslint-disable @typescript-eslint/no-explicit-any */
import logger from "../lib/logger.js";
import db from "../db/index.js";
import {
  removeGalleryIcon,
  writeGalleryIcon,
  type CropPixels,
} from "../lib/gallery-icon.js";
import { assertSlugId } from "../lib/id-shape.js";
import { invalidateGallery } from "../lib/stats-cache.js";

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
const createGallery = async (gallery: { id: string } & Record<string, any>) => {
  assertSlugId(gallery.id);
  logger.debug("Creating gallery", { id: gallery.id });
  await db.createGallery(gallery);
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
const updateGallery = async (
  galleryId: string,
  patch: Record<string, any>
) => {
  logger.debug("Updating gallery", { id: galleryId });
  await db.updateGallery(galleryId, patch);
};
// Cascade: unlink every gallery_photo link and every user_gallery row
// for this gallery before deleting it. Without this the FK RESTRICTs
// would refuse the delete.
const deleteGallery = async (galleryId: string) => {
  logger.debug("Deleting gallery", galleryId);
  await db.unlinkAllPhotos(galleryId);
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
