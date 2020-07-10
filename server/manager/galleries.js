const CONST = require("../utils/constants");
const logger = require("../utils/logger");
const db = require("../db");

module.exports = () => {
  const groupPhotosByYearMonthDay = (galleryPhotos) => {
    const photosByDate = {};
    galleryPhotos.forEach((photo) => {
      const yearMap = (photosByDate[photo.taken.year] =
        photosByDate[photo.taken.year] || {});
      const monthMap = (yearMap[photo.taken.month] =
        yearMap[photo.taken.month] || {});
      const dayPhotos = (monthMap[photo.taken.day] =
        monthMap[photo.taken.day] || []);
      // TODO: reduce meta for this?
      // dayPhotos.push(reducePhotoForList(photo));
      dayPhotos.push(photo);
    });
    return photosByDate;
  };

  const getAllGalleries = () => {
    logger.debug("Getting all galleries");
    return new Promise((resolve, reject) => {
      db.loadGalleries()
        .then((galleries) => {
          resolve([...galleries, ...Object.values(CONST.SPECIAL_GALLERIES)]);
        })
        .catch((error) => reject(error));
    });
  };
  const createGallery = (gallery) => {
    return new Promise((resolve, reject) => {
      logger.debug("Creating gallery", gallery);
      reject(CONST.ERROR_NOT_IMPLEMENTED);
    });
  };
  const getGallery = (galleryId) => {
    logger.debug("Getting gallery", galleryId);
    return new Promise((resolve, reject) => {
      const loadGalleryPhotos = (gallery) => {
        db.loadGalleryPhotos(galleryId)
          .then((galleryPhotos) => {
            const photosByYearMonthDay = groupPhotosByYearMonthDay(
              galleryPhotos
            );
            resolve({
              ...gallery,
              photos: photosByYearMonthDay,
            });
          })
          .catch((error) => reject(error));
      };
      if (galleryId.startsWith(CONST.SPECIAL_GALLERY_PREFIX)) {
        loadGalleryPhotos(CONST.SPECIAL_GALLERIES[galleryId]);
      } else {
        db.loadGallery(galleryId)
          .then((data) => {
            loadGalleryPhotos(data);
          })
          .catch((error) => reject(error));
      }
    });
  };
  const updateGallery = (gallery) => {
    return new Promise((resolve, reject) => {
      logger.debug("Updating gallery", gallery);
      reject(CONST.ERROR_NOT_IMPLEMENTED);
    });
  };
  const deleteGallery = (galleryId) => {
    logger.debug("Deleting gallery", galleryId);
    return new Promise((resolve, reject) => {
      reject(CONST.ERROR_NOT_IMPLEMENTED);
    });
  };

  return {
    getAllGalleries,
    createGallery,
    getGallery,
    updateGallery,
    deleteGallery,
  };
};
