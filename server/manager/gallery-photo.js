const CONST = require("../constants");

module.exports = (db) => {
  const getPhoto = (galleryId, photoId, onSuccess, onError) => {
    db.loadGalleryPhoto(galleryId, photoId, onSuccess, onError);
  };
  const linkPhoto = (galleryId, photoId, onSuccess, onError) => {
    onError(CONST.ERROR_NOT_IMPLEMENTED);
  };
  const unlinkPhoto = (galleryId, photoId, onSuccess, onError) => {
    onError(CONST.ERROR_NOT_IMPLEMENTED);
  };

  return {
    getPhoto,
    linkPhoto,
    unlinkPhoto,
  };
};
