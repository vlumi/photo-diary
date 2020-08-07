const logger = require("../lib/logger");
const db = require("../db");

module.exports = () => {
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

const getGalleryPhotos = async (galleryId) => {
  logger.debug("Getting photos from gallery", galleryId);
  return await db.loadGalleryPhotos(galleryId);
};
const getGalleryPhoto = async (galleryId, photoId) => {
  logger.debug("Getting photo", photoId, "from gallery", galleryId);
  return await db.loadGalleryPhoto(galleryId, photoId);
};
const linkGalleryPhoto = async (galleryId, photoId) => {
  logger.debug("Linking photo", photoId, "to gallery", galleryId);
  return await db.linkGalleryPhoto(galleryId, photoId);
};
const unlinkGalleryPhoto = async (galleryId, photoId) => {
  logger.debug("Unlinking photo", photoId, "from gallery", galleryId);
  return await db.unlinkGalleryPhoto([galleryId], [photoId]);
};
const unlinkAllPhotos = async (galleryId) => {
  logger.debug("Unlinking all photos from gallery", galleryId);
  return await db.unlinkAllPhotos(galleryId);
};
const unlinkAllGalleries = async (photoId) => {
  logger.debug("Unlinking photo", photoId, "from all galleries");
  return await db.unlinkAllGalleries(photoId);
};
