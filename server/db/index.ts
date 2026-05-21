import config from "../lib/config/index.js";
import type {
  Gallery,
  GalleryInput,
  MetaRow,
  Photo,
  PhotoInput,
  User,
  UserGalleryRow,
} from "./sqlite3/schema.js";

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
  loadMetas: async (): Promise<Record<string, string>> => {
    const metas = (await db.loadMetas()) as Array<Record<string, string>>;
    return metas.reduce<Record<string, string>>(
      (acc, obj) => ({ ...acc, ...obj }),
      {}
    );
  },
  createMeta: async (meta: { key: string; value: string }) => {
    await db.createMeta(meta);
  },
  loadMeta: async (key: string) => {
    return await db.loadMeta(key);
  },
  updateMeta: async (key: string, meta: Partial<MetaRow>) => {
    await db.updateMeta(key, meta);
  },
  deleteMeta: async (key: string) => {
    await db.deleteMeta(key);
  },

  loadUsers: async () => {
    return await db.loadUsers();
  },
  createUser: async (user: User) => {
    await db.createUser(user);
  },
  loadUser: async (userId: string) => {
    return await db.loadUser(userId);
  },
  updateUser: async (userId: string, user: Partial<User>) => {
    await db.updateUser(userId, user);
  },
  deleteUser: async (userId: string) => {
    await db.deleteUser(userId);
  },

  loadUserAccessControl: async (
    userId: string
  ): Promise<Record<string, number>> => {
    return await db.loadUserAccessControl(userId);
  },
  loadUserGalleryRows: async (
    filter: { userId?: string; galleryId?: string } = {}
  ): Promise<UserGalleryRow[]> => {
    return await db.loadUserGalleryRows(filter);
  },
  upsertUserGallery: async (row: {
    user_id: string;
    gallery_id: string;
    access_level?: number | null;
    hide_map?: number | null;
  }): Promise<void> => {
    await db.upsertUserGallery(row);
  },
  deleteUserGallery: async (userId: string, galleryId: string): Promise<void> => {
    await db.deleteUserGallery(userId, galleryId);
  },
  // Resolve the privacy cascade for (userId, galleryId): gallery-first
  // walk matching the access cascade — `requested → :public → :all` for
  // non-special galleries (skipping :public for :public/:private/:all
  // requests), with user-beats-guest at each gallery level. Returns the
  // first non-null `hide_map` encountered; undefined when nothing matches.
  resolveHideMap: async (
    userId: string,
    galleryId: string
  ): Promise<number | undefined> => {
    return await db.resolveHideMap(userId, galleryId);
  },

  loadGalleries: async () => {
    return await db.loadGalleries();
  },
  createGallery: async (gallery: GalleryInput) => {
    await db.createGallery(gallery as Gallery);
  },
  loadGallery: async (galleryId: string) => {
    return await db.loadGallery(galleryId);
  },
  updateGallery: async (galleryId: string, gallery: GalleryInput) => {
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
  createPhoto: async (photo: PhotoInput) => {
    await db.createPhoto(photo);
  },
  loadPhoto: async (photoId: string) => {
    return await db.loadPhoto(photoId);
  },
  updatePhoto: async (photoId: string, photo: PhotoInput) => {
    await db.updatePhoto(photoId, photo);
  },
  deletePhoto: async (photoId: string) => {
    await db.deletePhoto(photoId);
  },
};

// Re-export shared types so models can use them without reaching into the driver.
export type { Gallery, GalleryInput, MetaRow, Photo, PhotoInput, User, UserGalleryRow };
