const CONST = require("../utils/constants");

module.exports = (db) => {
  const getPhoto = (galleryId, photoId) => {
    return new Promise((resolve, reject) => {
      db.loadGalleryPhoto(galleryId, photoId)
        .then((photo) => resolve(photo))
        .catch((error) => reject(error));
    });
  };
  const linkPhoto = (galleryId, photoId) => {
    return new Promise((resolve, reject) => {
      console.log(`Linking ${photoId} to ${galleryId}`);
      reject(CONST.ERROR_NOT_IMPLEMENTED);
    });
  };
  const unlinkPhoto = (galleryId, photoId) => {
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
