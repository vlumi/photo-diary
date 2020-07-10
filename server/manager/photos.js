const CONST = require("../utils/constants");
const logger = require("../utils/logger");
const db = require("../db");

module.exports = () => {
  const getAllPhotos = () => {
    logger.debug("Getting all photos");
    return new Promise((resolve, reject) => {
      db.loadPhotos()
        .then((photos) => resolve(photos))
        .catch((error) => reject(error));
    });
  };

  const createPhoto = (photo) => {
    logger.debug("Creating photo", photo);
    return new Promise((resolve, reject) => {
      reject(CONST.ERROR_NOT_IMPLEMENTED);
    });
  };

  const getPhoto = (photoId) => {
    logger.debug("Getting photo", photoId);
    return new Promise((resolve, reject) => {
      db.loadPhoto(photoId)
        .then((photo) => resolve(photo))
        .catch((error) => reject(error));
    });
  };

  const updatePhoto = (photo) => {
    logger.debug("Updating photo", photo);
    return new Promise((resolve, reject) => {
      reject(CONST.ERROR_NOT_IMPLEMENTED);
    });
  };

  const deletePhoto = (photoId) => {
    logger.debug("Deleting photo", photoId);
    return new Promise((resolve, reject) => {
      reject(CONST.ERROR_NOT_IMPLEMENTED);
    });
  };

  return {
    getAllPhotos,
    createPhoto,
    getPhoto,
    updatePhoto,
    deletePhoto,
  };
};
