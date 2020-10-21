const CONST = require("../lib/constants.cjs");
const logger = require("../lib/logger.cjs");
const db = require("../db/index.cjs");

module.exports = () => {
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

const createPhoto = async (photo) => {
  logger.debug("Creating photo", photo);
  throw CONST.ERROR_NOT_IMPLEMENTED;
};

const getPhoto = async (photoId) => {
  logger.debug("Getting photo", photoId);
  return await db.loadPhoto(photoId);
};

const updatePhoto = async (photo) => {
  logger.debug("Updating photo", photo);
  throw CONST.ERROR_NOT_IMPLEMENTED;
};

const deletePhoto = async (photoId) => {
  logger.debug("Deleting photo", photoId);
  throw CONST.ERROR_NOT_IMPLEMENTED;
};
