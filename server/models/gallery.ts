/* eslint-disable @typescript-eslint/no-explicit-any */
import logger from "../lib/logger.js";
import db from "../db/index.js";

export default () => {
  return {
    init,
    getGalleries,
    createGallery,
    getGallery,
    updateGallery,
    deleteGallery,
  };
};

const init = async () => {};

const getGalleries = async () => {
  logger.debug("Getting all galleries");
  return await db.loadGalleries();
};
const createGallery = async (gallery: { id: string } & Record<string, any>) => {
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
};
