const CONST = require("../constants");

module.exports = (db) => {
  const getPhoto = (galleryId, photoId, onSuccess, onError) => {
    return new Promise((resolve, reject) => {
      db.loadGalleryPhoto(
        galleryId,
        photoId,
        () => resolve(),
        (error) => reject(error)
      );
    });
  };
  const linkPhoto = (galleryId, photoId, onSuccess, onError) => {
    return new Promise((resolve, reject) => {
      reject(CONST.ERROR_NOT_IMPLEMENTED);
    });
  };
  const unlinkPhoto = (galleryId, photoId, onSuccess, onError) => {
    return new Promise((resolve, reject) => {
      reject(CONST.ERROR_NOT_IMPLEMENTED);
    });
  };

  return {
    getPhoto,
    linkPhoto,
    unlinkPhoto,
  };
};
