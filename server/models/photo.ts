/* eslint-disable @typescript-eslint/no-explicit-any */
import logger from "../lib/logger.js";
import db from "../db/index.js";

export default () => {
  return {
    init,
    getPhotos,
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
