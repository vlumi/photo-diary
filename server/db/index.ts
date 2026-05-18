/* eslint-disable @typescript-eslint/no-explicit-any */
import config from "../lib/config/index.js";

type Row = Record<string, any>;

const drivers = {
  dummy: () => import("./dummy.js"),
  sqlite3: () => import("./sqlite3/index.js"),
};

const isValidDriver = (d: string | undefined): d is keyof typeof drivers =>
  d !== undefined && d in drivers;

const connectDb = async () => {
  const driver = config.DB_DRIVER;
  if (!driver) {
    throw "The DB_DRIVER environment variable must be set.";
  }
  if (!isValidDriver(driver)) {
    throw `Unknown DB_DRIVER: ${driver}`;
  }
  const mod = await drivers[driver]();
  return mod.default();
};
const db = await connectDb();

export default {
  loadMetas: async () => {
    const metas = (await db.loadMetas()) as Row[];
    return metas.reduce<Row>((acc, obj) => ({ ...acc, ...obj }), {});
  },
  createMeta: async (meta: Row) => {
    await db.createMeta(meta);
  },
  loadMeta: async (key: string) => {
    return await db.loadMeta(key);
  },
  updateMeta: async (key: string, meta: Row) => {
    await db.updateMeta(key, meta);
  },
  deleteMeta: async (key: string) => {
    await db.deleteMeta(key);
  },

  loadUsers: async () => {
    return await db.loadUsers();
  },
  createUser: async (user: Row) => {
    await db.createUser(user);
  },
  loadUser: async (userId: string) => {
    return await db.loadUser(userId);
  },
  updateUser: async (userId: string, user: Row) => {
    await db.updateUser(userId, user);
  },
  deleteUser: async (userId: string) => {
    await db.deleteUser(userId);
  },

  loadUserAccessControl: async (userId: string): Promise<Record<string, number>> => {
    return await db.loadUserAccessControl(userId);
  },

  loadGalleries: async () => {
    return await db.loadGalleries();
  },
  createGallery: async (gallery: Row) => {
    await db.createGallery(gallery);
  },
  loadGallery: async (galleryId: string) => {
    return await db.loadGallery(galleryId);
  },
  updateGallery: async (galleryId: string, gallery: Row) => {
    await db.updateGallery(galleryId, gallery);
  },
  deleteGallery: async (galleryId: string) => {
    await db.deleteGallery(galleryId);
  },

  loadGalleryPhotos: async (galleryId: string) => {
    return await db.loadGalleryPhotos(galleryId);
  },
  linkGalleryPhoto: async (galleryIds: string[], photoIds: string[]) => {
    return await db.linkGalleryPhoto(galleryIds, photoIds);
  },
  loadGalleryPhoto: async (galleryId: string, photoId: string) => {
    return await db.loadGalleryPhoto(galleryId, photoId);
  },
  unlinkGalleryPhoto: async (galleryId: string, photoId: string) => {
    return await db.unlinkGalleryPhoto(galleryId, photoId);
  },
  unlinkAllPhotos: async (galleryId: string) => {
    return await db.unlinkAllPhotos(galleryId);
  },
  unlinkAllGalleries: async (photoId: string) => {
    return await db.unlinkAllGalleries(photoId);
  },

  loadPhotos: async () => {
    return await db.loadPhotos();
  },
  createPhoto: async (photo: Row) => {
    await db.createPhoto(photo);
  },
  loadPhoto: async (photoId: string) => {
    return await db.loadPhoto(photoId);
  },
  updatePhoto: async (photoId: string, photo: Row) => {
    await db.updatePhoto(photoId, photo);
  },
  deletePhoto: async (photoId: string) => {
    await db.deletePhoto(photoId);
  },
};
