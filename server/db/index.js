const config = require("../lib/config");

const DRIVER = {
  dummy: () => require("./dummy"),
  sqlite3: () => require("./sqlite3"),
};

const connectDb = () => {
  const driver = config.DB_DRIVER;
  if (!driver) {
    throw "The DB_DRIVER environment variable must be set.";
  }
  return DRIVER[driver]()();
};
const db = connectDb();

module.exports = {
  loadUsers: async () => {
    return await db.loadUsers();
  },
  createUser: async (user) => {
    await db.createUser(user);
  },
  loadUser: async (userId) => {
    return await db.loadUser(userId);
  },
  updateUser: async (userId, user) => {
    await db.updateUser(userId, user);
  },
  deleteUser: async (userId) => {
    await db.deleteUser(userId);
  },

  loadUserAccessControl: async (userId) => {
    return await db.loadUserAccessControl(userId);
  },

  loadGalleries: async () => {
    return await db.loadGalleries();
  },
  createGallery: async (gallery) => {
    await db.createGallery(gallery);
  },
  loadGallery: async (galleryId) => {
    return await db.loadGallery(galleryId);
  },
  updateGallery: async (galleryId, gallery) => {
    await db.updateGallery(galleryId, gallery);
  },
  deleteGallery: async (galleryId) => {
    await db.deleteGallery(galleryId);
  },

  loadGalleryPhotos: async (galleryId) => {
    return await db.loadGalleryPhotos(galleryId);
  },
  linkGalleryPhoto: async (galleryIds, photoIds) => {
    return await db.linkGalleryPhoto(galleryIds, photoIds);
  },
  loadGalleryPhoto: async (galleryId, photoId) => {
    return await db.loadGalleryPhoto(galleryId, photoId);
  },
  unlinkGalleryPhoto: async (galleryId, photoId) => {
    return await db.unlinkGalleryPhoto(galleryId, photoId);
  },
  unlinkAllPhotos: async (galleryId) => {
    return await db.unlinkAllPhotos(galleryId);
  },
  unlinkAllGalleries: async (photoId) => {
    return await db.unlinkAllGalleries(photoId);
  },

  loadPhotos: async () => {
    return await db.loadPhotos();
  },
  createPhoto: async (photo) => {
    await db.createPhoto(photo);
  },
  loadPhoto: async (photoId) => {
    return await db.loadPhoto(photoId);
  },
  updatePhoto: async (photoId, photo) => {
    await db.updatePhoto(photoId, photo);
  },
  deletePhoto: async (photoId) => {
    await db.deletePhoto(photoId);
  },
};
