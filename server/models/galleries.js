const CONST = require("../utils/constants");
const logger = require("../utils/logger");
const db = require("../db");

module.exports = () => {
  const groupPhotosByYearMonthDay = (galleryPhotos) => {
    const photosByDate = {};
    galleryPhotos.forEach((photo) => {
      const yearMap = (photosByDate[photo.taken.instant.year] =
        photosByDate[photo.taken.instant.year] || {});
      const monthMap = (yearMap[photo.taken.instant.month] =
        yearMap[photo.taken.instant.month] || {});
      const dayPhotos = (monthMap[photo.taken.instant.day] =
        monthMap[photo.taken.instant.day] || []);
      // TODO: reduce meta for this?
      // dayPhotos.push(reducePhotoForList(photo));
      dayPhotos.push(photo);
    });
    return photosByDate;
  };

  const getAllGalleries = async () => {
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
      const photosByYearMonthDay = groupPhotosByYearMonthDay(galleryPhotos);
      return {
        ...gallery,
        photos: photosByYearMonthDay,
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

  return {
    getAllGalleries,
    createGallery,
    getGallery,
    updateGallery,
    deleteGallery,
  };
};
