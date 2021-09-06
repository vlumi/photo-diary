import CONST from "../lib/constants.cjs";
import logger from "../lib/logger.cjs";
import db from "../db/index.js";

export default () => {
  return {
    init,
    getGalleries,
    createGallery,
    getGallery,
    updateGallery,
    deleteGallery,
  };
};

const init = async () => {};

const getGalleries = async () => {
  logger.debug("Getting all galleries");
  const galleries = await db.loadGalleries();
  return [...galleries, ...Object.values(CONST.SPECIAL_GALLERIES)];
};
const createGallery = async (gallery) => {
  logger.debug("Creating gallery", gallery);
  throw CONST.ERROR_NOT_IMPLEMENTED;
};
const getGallery = async (galleryId) => {
  logger.debug("Getting gallery", galleryId);
  const loadGalleryPhotos = async (gallery) => {
    const galleryPhotos = await db.loadGalleryPhotos(galleryId);
    return {
      ...gallery,
      photos: galleryPhotos,
    };
  };
  if (galleryId.startsWith(CONST.SPECIAL_GALLERY_PREFIX)) {
    return await loadGalleryPhotos(CONST.SPECIAL_GALLERIES[galleryId]);
  }
  const gallery = await db.loadGallery(galleryId);
  return await loadGalleryPhotos(gallery);
};
const updateGallery = async (gallery) => {
  logger.debug("Updating gallery", gallery);
  throw CONST.ERROR_NOT_IMPLEMENTED;
};
const deleteGallery = async (galleryId) => {
  logger.debug("Deleting gallery", galleryId);
  throw CONST.ERROR_NOT_IMPLEMENTED;
};
