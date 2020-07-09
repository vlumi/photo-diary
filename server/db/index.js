const DRIVER = {
  dummy: require("./dummy"),
  legacy_sqlite3: require("./legacy-sqlite3"),
};

const connectDb = () => {
  const driver = process.env.DB_DRIVER;
  if (!driver) {
    throw "The DB_DRIVER environment variable must be set.";
  }
  const dbOptions = process.env.DB_OPTS;
  return DRIVER[driver](dbOptions);
};
const db = connectDb();

module.exports = {
  loadUserAccessControl: (username) => {
    return db.loadUserAccessControl(username);
  },
  loadUser: (username) => {
    return db.loadUser(username);
  },
  loadGalleries: () => {
    return db.loadGalleries();
  },
  loadGallery: (galleryId) => {
    return db.loadGallery(galleryId);
  },
  loadGalleryPhotos: (galleryId) => {
    return db.loadGalleryPhotos(galleryId);
  },
  loadGalleryPhoto: (galleryId, photoId) => {
    return db.loadGalleryPhoto(galleryId, photoId);
  },
  loadPhotos: () => {
    return db.loadPhotos();
  },
  loadPhoto: (photoId) => {
    return db.loadPhoto(photoId);
  },
};
