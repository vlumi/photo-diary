import logger from "../lib/logger.js";
import db from "../db/index.js";

export default () => {
  return {
    init,
    getGalleryPhotos,
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
  return await db.linkGalleryPhoto([galleryId], [photoId]);
};
const unlinkGalleryPhoto = async (galleryId: string, photoId: string) => {
  logger.debug("Unlinking photo", photoId, "from gallery", galleryId);
  return await db.unlinkGalleryPhoto(galleryId, photoId);
};
const unlinkAllPhotos = async (galleryId: string) => {
  logger.debug("Unlinking all photos from gallery", galleryId);
  return await db.unlinkAllPhotos(galleryId);
};
const unlinkAllGalleries = async (photoId: string) => {
  logger.debug("Unlinking photo", photoId, "from all galleries");
  return await db.unlinkAllGalleries(photoId);
};
