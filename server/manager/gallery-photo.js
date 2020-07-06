const CONST = require("../constants");

module.exports = (db) => {
  const linkPhoto = (galleryId, photoId, onSuccess, onError) => {
    onError(CONST.ERROR_NOT_IMPLEMENTED);
  };
  const unlinkPhoto = (galleryId, photoId, onSuccess, onError) => {
    onError(CONST.ERROR_NOT_IMPLEMENTED);
  };

  return {
    linkPhoto,
    unlinkPhoto,
  };
};
