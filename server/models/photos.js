const CONST = require("../utils/constants");
const logger = require("../utils/logger");
const db = require("../db");

module.exports = () => {
  const getAllPhotos = async () => {
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

  return {
    getAllPhotos,
    createPhoto,
    getPhoto,
    updatePhoto,
    deletePhoto,
  };
};
