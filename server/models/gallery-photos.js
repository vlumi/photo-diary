const CONST = require("../utils/constants");
const logger = require("../utils/logger");
const db = require("../db");

module.exports = () => {
  const getPhoto = async (galleryId, photoId) => {
    logger.debug("Getting photo", photoId, "from gallery", galleryId);
    return await db.loadGalleryPhoto(galleryId, photoId);
  };
  const linkPhoto = async (galleryId, photoId) => {
    logger.debug("Linking photo", photoId, "to gallery", galleryId);
    throw CONST.ERROR_NOT_IMPLEMENTED;
  };
  const unlinkPhoto = async (galleryId, photoId) => {
    logger.debug("Unlinking photo", photoId, "from gallery", galleryId);
    console.log(`Unlinking ${photoId} from ${galleryId}`);
    throw CONST.ERROR_NOT_IMPLEMENTED;
  };

  return {
    getPhoto,
    linkPhoto,
    unlinkPhoto,
  };
};
