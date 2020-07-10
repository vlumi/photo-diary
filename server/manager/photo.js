const CONST = require("../utils/constants");

module.exports = (db) => {
  const getAllPhotos = () => {
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

  const getPhoto = (photoId) => {
    return new Promise((resolve, reject) => {
      db.loadPhoto(photoId)
        .then((photo) => resolve(photo))
        .catch((error) => reject(error));
    });
  };

  const updatePhoto = (photo) => {
    return new Promise((resolve, reject) => {
      console.log(`Update photo ${photo}`);
      reject(CONST.ERROR_NOT_IMPLEMENTED);
    });
  };

  const deletePhoto = (photoId) => {
    return new Promise((resolve, reject) => {
      console.log(`Delete photo ${photoId}`);
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
