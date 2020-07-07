const CONST = require("../constants");

module.exports = (db) => {
  const getAllPhotos = (onSuccess, onError) => {
    return new Promise((resolve, reject) => {
      db.loadPhotos()
        .then((photos) => resolve(photos))
        .catch((error) => reject(error));
    });
  };

  const createPhoto = () => {
    return new Promise((resolve, reject) => {
      reject(CONST.ERROR_NOT_IMPLEMENTED);
    });
  };

  const getPhoto = (photoId, onSuccess, onError) => {
    return new Promise((resolve, reject) => {
      db.loadPhoto(photoId)
        .then((photo) => resolve(photo))
        .catch((error) => reject(error));
    });
  };

  const updatePhoto = (photo, onSuccess, onError) => {
    return new Promise((resolve, reject) => {
      reject(CONST.ERROR_NOT_IMPLEMENTED);
    });
  };

  const deletePhoto = (photoId, onSuccess, onError) => {
    return new Promise((resolve, reject) => {
      reject(CONST.ERROR_NOT_IMPLEMENTED);
    });
  };

  return {
    getAllPhotos,
    createPhoto,
    getPhoto,
    updatePhoto,
    deletePhoto,
  };
};
