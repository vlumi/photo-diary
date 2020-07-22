const config = require("../utils/config");

const DRIVER = {
  dummy: () => require("./dummy"),
  sqlite3: () => require("./sqlite3"),
  legacy_sqlite3: () => require("./legacy-sqlite3"),
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
  updateUser: async (userId, user) => {
    await db.updateUser(userId, user);
  },
  loadUser: async (username) => {
    return await db.loadUser(username);
  },

  loadUserAccessControl: async (username) => {
    return await db.loadUserAccessControl(username);
  },

  loadGalleries: async () => {
    return await db.loadGalleries();
  },
  loadGallery: async (galleryId) => {
    return await db.loadGallery(galleryId);
  },

  loadGalleryPhotos: async (galleryId) => {
    return await db.loadGalleryPhotos(galleryId);
  },
  loadGalleryPhoto: async (galleryId, photoId) => {
    return await db.loadGalleryPhoto(galleryId, photoId);
  },

  loadPhotos: async () => {
    return await db.loadPhotos();
  },
  loadPhoto: async (photoId) => {
    return await db.loadPhoto(photoId);
  },
};
