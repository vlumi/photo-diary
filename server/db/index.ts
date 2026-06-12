import config from "../lib/config/index.js";
import type { DateRange, FilterShape } from "../lib/photo-filter-eval.js";
import type {
  Gallery,
  GalleryInput,
  Group,
  GroupGalleryRow,
  MetaRow,
  Photo,
  PhotoInput,
  SavedFilter,
  SessionRow,
  User,
  UserGalleryRow,
} from "./sqlite3/schema.js";

export interface QueryFilteredOpts {
  filter?: FilterShape;
  dateRange?: DateRange;
  year?: number;
  month?: number;
  day?: number;
  lang?: string;
}
export interface CountsFilteredOpts {
  filter?: FilterShape;
  dateRange?: DateRange;
  year?: number;
}
export interface NeighborsFilteredOpts {
  filter?: FilterShape;
  dateRange?: DateRange;
  lang?: string;
}
export interface NeighborsResult {
  previous?: Photo;
  next?: Photo;
  first?: Photo;
  last?: Photo;
  position?: number;
  total: number;
}
export interface FilterValuesResult {
  categoryValues: Record<string, string[]>;
  byCityLocalized: Record<string, string>;
}

const drivers = {
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

  createSession: async (session: SessionRow): Promise<void> => {
    await db.createSession(session);
  },
  loadSession: async (sessionId: string): Promise<SessionRow | undefined> => {
    return await db.loadSession(sessionId);
  },
  updateSession: async (
    sessionId: string,
    patch: Partial<SessionRow>
  ): Promise<void> => {
    await db.updateSession(sessionId, patch);
  },
  deleteSession: async (sessionId: string): Promise<void> => {
    await db.deleteSession(sessionId);
  },
  deleteUserSessions: async (userId: string): Promise<void> => {
    await db.deleteUserSessions(userId);
  },

  // Resolve effective access for (userId, galleryId):
  //   user.is_admin → global admin (bypass).
  //   matching user_gallery row (user or :guest, this gallery) → access;
  //     is_editor flag on the winning row distinguishes editor from view.
  //   no match → deny.
  resolveAccessLevel: async (
    userId: string,
    galleryId: string
  ): Promise<{ hasAccess: boolean; isEditor: boolean }> => {
    return await db.resolveAccessLevel(userId, galleryId);
  },
  loadUserGalleryRows: async (
    filter: { userId?: string; galleryId?: string } = {}
  ): Promise<UserGalleryRow[]> => {
    return await db.loadUserGalleryRows(filter);
  },
  upsertUserGallery: async (row: {
    user_id: string;
    gallery_id: string;
    is_editor?: boolean;
    hide_map?: number | null;
  }): Promise<void> => {
    await db.upsertUserGallery(row);
  },
  deleteUserGallery: async (userId: string, galleryId: string): Promise<void> => {
    await db.deleteUserGallery(userId, galleryId);
  },
  // Resolve privacy for (userId, galleryId): user.is_admin → 0 (show);
  // else user row → group rows (privacy-first MAX within layer) →
  // :guest row → undefined.
  resolveHideMap: async (
    userId: string,
    galleryId: string
  ): Promise<number | undefined> => {
    return await db.resolveHideMap(userId, galleryId);
  },

  // Groups
  loadGroups: async (): Promise<Group[]> => {
    return await db.loadGroups();
  },
  loadGroup: async (groupId: string): Promise<Group> => {
    return await db.loadGroup(groupId);
  },
  createGroup: async (group: Group): Promise<void> => {
    await db.createGroup(group);
  },
  updateGroup: async (
    groupId: string,
    patch: Partial<Group>
  ): Promise<void> => {
    await db.updateGroup(groupId, patch);
  },
  deleteGroup: async (groupId: string): Promise<void> => {
    await db.deleteGroup(groupId);
  },
  loadGroupMembers: async (groupId: string): Promise<string[]> => {
    return await db.loadGroupMembers(groupId);
  },
  loadUserGroups: async (userId: string): Promise<string[]> => {
    return await db.loadUserGroups(userId);
  },
  addUserGroup: async (userId: string, groupId: string): Promise<void> => {
    await db.addUserGroup(userId, groupId);
  },
  removeUserGroup: async (
    userId: string,
    groupId: string
  ): Promise<void> => {
    await db.removeUserGroup(userId, groupId);
  },
  loadGroupGalleryRows: async (
    filter: { groupId?: string; galleryId?: string } = {}
  ): Promise<GroupGalleryRow[]> => {
    return await db.loadGroupGalleryRows(filter);
  },
  upsertGroupGallery: async (row: {
    group_id: string;
    gallery_id: string;
    is_editor?: boolean;
    hide_map?: number | null;
  }): Promise<void> => {
    await db.upsertGroupGallery(row);
  },
  deleteGroupGallery: async (
    groupId: string,
    galleryId: string
  ): Promise<void> => {
    await db.deleteGroupGallery(groupId, galleryId);
  },

  loadGalleries: async () => {
    return await db.loadGalleries();
  },
  setGalleryOrder: async (ids: string[]): Promise<void> => {
    await db.setGalleryOrder(ids);
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

  // Virtual gallery (#22) plumbing.
  upsertVirtualGallery: async (
    galleryId: string,
    sources: string[]
  ): Promise<void> => {
    await db.upsertVirtualGallery(galleryId, sources);
  },
  deleteVirtualGallery: async (galleryId: string): Promise<void> => {
    await db.deleteVirtualGallery(galleryId);
  },
  isVirtualGallery: async (galleryId: string): Promise<boolean> => {
    return (await db.isVirtualGallery(galleryId)) as boolean;
  },
  isReferencedAsSource: async (galleryId: string): Promise<boolean> => {
    return (await db.isReferencedAsSource(galleryId)) as boolean;
  },

  // Saved filters (#285): pseudo-galleries of type='saved_filter'
  // anchored to a source gallery + a stored baseline. `sourceGalleryId`
  // identifies which gallery owns the saved filter for listing /
  // routing purposes; the saved filter's own id is a gallery id in
  // its own right (unified namespace).
  loadSavedFilters: async (sourceGalleryId: string): Promise<SavedFilter[]> => {
    return (await db.loadSavedFilters(sourceGalleryId)) as SavedFilter[];
  },
  loadSavedFilter: async (
    sourceGalleryId: string,
    id: string
  ): Promise<SavedFilter> => {
    return (await db.loadSavedFilter(sourceGalleryId, id)) as SavedFilter;
  },
  createSavedFilter: async (filter: SavedFilter): Promise<void> => {
    await db.createSavedFilter(filter);
  },
  updateSavedFilter: async (
    sourceGalleryId: string,
    id: string,
    patch: Partial<
      Pick<SavedFilter, "title" | "description" | "definition">
    > & {
      titleLocalized?: Record<string, string | undefined>;
      descriptionLocalized?: Record<string, string | undefined>;
    }
  ): Promise<void> => {
    await db.updateSavedFilter(sourceGalleryId, id, patch);
  },
  deleteSavedFilter: async (sourceGalleryId: string, id: string): Promise<void> => {
    await db.deleteSavedFilter(sourceGalleryId, id);
  },

  loadGalleryPhotos: async (galleryId: string, lang?: string) => {
    return await db.loadGalleryPhotos(galleryId, lang);
  },
  queryFilteredPhotos: async (
    galleryId: string,
    opts: QueryFilteredOpts = {}
  ): Promise<Photo[]> => {
    return (await db.queryFilteredPhotos(galleryId, opts)) as Photo[];
  },
  queryFilteredPhotosGlobal: async (
    opts: QueryFilteredOpts = {}
  ): Promise<Photo[]> => {
    return (await db.queryFilteredPhotosGlobal(opts)) as Photo[];
  },
  queryFilteredPhotoCounts: async (
    galleryId: string,
    opts: CountsFilteredOpts = {}
  ): Promise<Record<string, number>> => {
    return (await db.queryFilteredPhotoCounts(
      galleryId,
      opts
    )) as Record<string, number>;
  },
  queryFilteredPhotoNeighbors: async (
    galleryId: string,
    photoId: string,
    opts: NeighborsFilteredOpts = {}
  ): Promise<NeighborsResult> => {
    return (await db.queryFilteredPhotoNeighbors(
      galleryId,
      photoId,
      opts
    )) as NeighborsResult;
  },
  queryGalleryFilterValues: async (
    galleryId: string,
    lang?: string
  ): Promise<FilterValuesResult> => {
    return (await db.queryGalleryFilterValues(
      galleryId,
      lang
    )) as FilterValuesResult;
  },
  queryGlobalFilterValues: async (
    lang?: string
  ): Promise<FilterValuesResult> => {
    return (await db.queryGlobalFilterValues(lang)) as FilterValuesResult;
  },
  linkGalleryPhoto: async (galleryIds: string[], photoIds: string[]) => {
    return await db.linkGalleryPhoto(galleryIds, photoIds);
  },
  loadGalleryPhoto: async (galleryId: string, photoId: string, lang?: string) => {
    return await db.loadGalleryPhoto(galleryId, photoId, lang);
  },
  loadGalleryPhotoByOriginalFilename: async (
    galleryId: string,
    originalFilename: string,
    lang?: string
  ) => {
    return await db.loadGalleryPhotoByOriginalFilename(
      galleryId,
      originalFilename,
      lang
    );
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
  loadAllGalleryPhotoLinks: async () => {
    return await db.loadAllGalleryPhotoLinks();
  },

  loadPhotos: async (lang?: string) => {
    return await db.loadPhotos(lang);
  },
  createPhoto: async (photo: PhotoInput) => {
    await db.createPhoto(photo);
  },
  loadPhoto: async (photoId: string, lang?: string) => {
    return await db.loadPhoto(photoId, lang);
  },
  loadPhotosByOriginalFilename: async (originalFilename: string) => {
    return await db.loadPhotosByOriginalFilename(originalFilename);
  },
  loadOrphanPhotoIds: async (): Promise<string[]> => {
    return await db.loadOrphanPhotoIds();
  },
  loadOrphanGalleryPhotoLinks: async (): Promise<
    Array<{ galleryId: string; photoId: string; missing: "photo" | "gallery" }>
  > => {
    return await db.loadOrphanGalleryPhotoLinks();
  },
  loadEmptyGalleryIds: async (): Promise<string[]> => {
    return await db.loadEmptyGalleryIds();
  },
  loadOrphanUserGalleryRows: async (): Promise<
    Array<{ userId: string; galleryId: string; missing: "user" | "gallery" }>
  > => {
    return await db.loadOrphanUserGalleryRows();
  },
  updatePhoto: async (photoId: string, photo: PhotoInput) => {
    await db.updatePhoto(photoId, photo);
  },
  renamePhoto: async (oldId: string, newId: string) => {
    await db.renamePhoto(oldId, newId);
  },
  upsertGeocoded: async (
    photoId: string,
    lang: string,
    fields: {
      countryCode?: string | null;
      stateCode?: string | null;
      city?: string | null;
      address?: string | null;
    }
  ) => {
    await db.upsertGeocoded(photoId, lang, fields);
  },
  markGeocodeNoData: async (photoId: string) => {
    await db.markGeocodeNoData(photoId);
  },
  clearGeocoded: async (photoId: string) => {
    await db.clearGeocoded(photoId);
  },
  loadPhotosMissingGeocoded: async (lang: string, limit: number) => {
    return await db.loadPhotosMissingGeocoded(lang, limit);
  },
  deletePhoto: async (photoId: string) => {
    await db.deletePhoto(photoId);
  },
  loadPhotoLocalized: async (lang: string) => {
    return await db.loadPhotoLocalized(lang);
  },
  clearLocalizedCity: async (photoId: string, lang: string) => {
    await db.clearLocalizedCity(photoId, lang);
  },
};

// Re-export shared types so models can use them without reaching into the driver.
export type {
  Gallery,
  GalleryInput,
  Group,
  GroupGalleryRow,
  MetaRow,
  Photo,
  PhotoInput,
  SessionRow,
  User,
  UserGalleryRow,
};
