const CONST = require("../constants");

module.exports = (db) => {
  const getAllPhotos = (onSuccess, onError) =>
    db.loadPhotos(onSuccess, onError);

  const createPhoto = () => {
    onError(CONST.ERROR_NOT_IMPLEMENTED);
  };

  const getPhoto = (photoId, onSuccess, onError) =>
    db.loadPhoto(photoId, onSuccess, onError);

  const updatePhoto = (photo, onSuccess, onError) => {
    onError(CONST.ERROR_NOT_IMPLEMENTED);
  };

  const deletePhoto = (photoId, onSuccess, onError) => {
    onError(CONST.ERROR_NOT_IMPLEMENTED);
  };

  return {
    getAllPhotos,
    createPhoto,
    getPhoto,
    updatePhoto,
    deletePhoto,
  };
};
