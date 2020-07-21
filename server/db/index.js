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
    return db.loadUsers();
  },
  loadUser: async (username) => {
    return db.loadUser(username);
  },
  loadUserAccessControl: async (username) => {
    return db.loadUserAccessControl(username);
  },
  loadGalleries: async () => {
    return db.loadGalleries();
  },
  loadGallery: async (galleryId) => {
    return db.loadGallery(galleryId);
  },
  loadGalleryPhotos: async (galleryId) => {
    return db.loadGalleryPhotos(galleryId);
  },
  loadGalleryPhoto: async (galleryId, photoId) => {
    return db.loadGalleryPhoto(galleryId, photoId);
  },
  loadPhotos: async () => {
    return db.loadPhotos();
  },
  loadPhoto: async (photoId) => {
    return db.loadPhoto(photoId);
  },
};
