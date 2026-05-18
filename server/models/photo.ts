/* eslint-disable @typescript-eslint/no-explicit-any */
import CONST from "../lib/constants.js";
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

const createPhoto = async (photo: Record<string, any>) => {
  logger.debug("Creating photo", photo);
  throw CONST.ERROR_NOT_IMPLEMENTED;
};

const getPhoto = async (photoId: string) => {
  logger.debug("Getting photo", photoId);
  return await db.loadPhoto(photoId);
};

const updatePhoto = async (photo: Record<string, any>) => {
  logger.debug("Updating photo", photo);
  throw CONST.ERROR_NOT_IMPLEMENTED;
};

const deletePhoto = async (photoId: string) => {
  logger.debug("Deleting photo", photoId);
  throw CONST.ERROR_NOT_IMPLEMENTED;
};
