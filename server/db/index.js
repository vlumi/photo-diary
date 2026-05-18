import config from "../lib/config/index.js";

const drivers = {
  dummy: () => import("./dummy.js"),
  sqlite3: () => import("./sqlite3/index.js"),
};

const connectDb = async () => {
  const driver = config.DB_DRIVER;
  if (!driver) {
    throw "The DB_DRIVER environment variable must be set.";
  }
  const mod = await drivers[driver]();
  return mod.default();
};
const db = await connectDb();

export default {
  loadMetas: async () => {
    return (await db.loadMetas()).reduce((acc, obj) => {
      return {
        ...acc,
        ...obj,
      };
    }, {});
  },
  createMeta: async (meta) => {
    await db.createMeta(meta);
  },
  loadMeta: async (key) => {
    return await db.loadMeta(key);
  },
  updateMeta: async (key, meta) => {
    await db.updateMeta(key, meta);
  },
  deleteMeta: async (key) => {
    await db.deleteMeta(key);
  },

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
