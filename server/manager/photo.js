const CONST = require("../constants");

module.exports = (db) => {
  const getAllPhotos = (onSuccess, onError) => {
    return new Promise((resolve, reject) => {
      db.loadPhotos(
        () => resolve(),
        (error) => reject(error)
      );
    });
  };

  const createPhoto = () => {
    return new Promise((resolve, reject) => {
      reject(CONST.ERROR_NOT_IMPLEMENTED);
    });
  };

  const getPhoto = (photoId, onSuccess, onError) => {
    return new Promise((resolve, reject) => {
      db.loadPhoto(
        photoId,
        () => resolve(),
        (error) => reject(error)
      );
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
