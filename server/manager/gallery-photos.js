const CONST = require("../utils/constants");
const logger = require("../utils/logger");
const db = require("../db");

module.exports = () => {
  const getPhoto = (galleryId, photoId) => {
    logger.debug("Getting photo", photoId, "from gallery", galleryId);
    return new Promise((resolve, reject) => {
      db.loadGalleryPhoto(galleryId, photoId)
        .then((photo) => resolve(photo))
        .catch((error) => reject(error));
    });
  };
  const linkPhoto = (galleryId, photoId) => {
    logger.debug("Linking photo", photoId, "to gallery", galleryId);
    return new Promise((resolve, reject) => {
      reject(CONST.ERROR_NOT_IMPLEMENTED);
    });
  };
  const unlinkPhoto = (galleryId, photoId) => {
    logger.debug("Unlinking photo", photoId, "from gallery", galleryId);
    return new Promise((resolve, reject) => {
      console.log(`Unlinking ${photoId} from ${galleryId}`);
      reject(CONST.ERROR_NOT_IMPLEMENTED);
    });
  };

  return {
    getPhoto,
    linkPhoto,
    unlinkPhoto,
  };
};
