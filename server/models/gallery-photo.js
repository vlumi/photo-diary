const CONST = require("../utils/constants");
const logger = require("../utils/logger");
const db = require("../db");

module.exports = () => {
  return {
    init,
    getGalleryPhoto,
    linkGalleryPhoto,
    unlinkGalleryPhoto,
  };
};

const init = async () => {};

const getGalleryPhoto = async (galleryId, photoId) => {
  logger.debug("Getting photo", photoId, "from gallery", galleryId);
  return await db.loadGalleryPhoto(galleryId, photoId);
};
const linkGalleryPhoto = async (galleryId, photoId) => {
  logger.debug("Linking photo", photoId, "to gallery", galleryId);
  throw CONST.ERROR_NOT_IMPLEMENTED;
};
const unlinkGalleryPhoto = async (galleryId, photoId) => {
  logger.debug("Unlinking photo", photoId, "from gallery", galleryId);
  throw CONST.ERROR_NOT_IMPLEMENTED;
};
