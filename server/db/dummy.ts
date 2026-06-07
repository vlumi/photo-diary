/* eslint-disable @typescript-eslint/no-explicit-any */
import { randomUUID } from "node:crypto";

import CONST from "../lib/constants.js";
import { NotFoundError, NotImplementedError } from "../lib/errors.js";
import { acceptLocalizedCity } from "../lib/localized-script.js";

/**
 * Dummy DB, with all DB values hard-coded.
 */
export default () => {
  return {
    init,

    loadMetas,
    createMeta,
    loadMeta,
    updateMeta,
    deleteMeta,

    loadUsers,
    createUser,
    loadUser,
    updateUser,
    deleteUser,

    createSession,
    loadSession,
    updateSession,
    deleteSession,
    deleteUserSessions,

    resolveAccessLevel,
    loadUserGalleryRows,
    upsertUserGallery,
    deleteUserGallery,
    resolveHideMap,

    loadGroups,
    loadGroup,
    createGroup,
    updateGroup,
    deleteGroup,
    loadGroupMembers,
    loadUserGroups,
    addUserGroup,
    removeUserGroup,
    loadGroupGalleryRows,
    upsertGroupGallery,
    deleteGroupGallery,

    loadGalleries,
    createGallery,
    loadGallery,
    updateGallery,
    deleteGallery,

    loadGalleryPhotos,
    linkGalleryPhoto,
    loadGalleryPhoto,
    unlinkGalleryPhoto,
    unlinkAllPhotos,
    unlinkAllGalleries,
    loadAllGalleryPhotoLinks,

    loadPhotos,
    createPhoto,
    loadPhoto,
    loadPhotosByOriginalFilename,
    loadOrphanPhotoIds,
    loadOrphanGalleryPhotoLinks,
    loadEmptyGalleryIds,
    loadOrphanUserGalleryRows,
    updatePhoto,
    renamePhoto,
    upsertGeocoded,
    markGeocodeNoData,
    clearGeocoded,
    loadPhotosMissingGeocoded,
    deletePhoto,
    loadPhotoLocalized,
    clearLocalizedCity,
  };
};

let db: any = undefined;
const sessions: Record<string, {
  id: string;
  user_id: string;
  refresh_token_hash: string;
  created_at: number;
  last_used_at: number;
}> = {};
const init = () => {
  db = JSON.parse(dbDump);
  Object.keys(sessions).forEach((id) => delete sessions[id]);
};

const createSession = async (session: {
  id: string;
  user_id: string;
  refresh_token_hash: string;
  created_at: number;
  last_used_at: number;
}) => {
  sessions[session.id] = { ...session };
};
const loadSession = async (sessionId: string) => {
  return sessions[sessionId];
};
const updateSession = async (
  sessionId: string,
  patch: Partial<{ refresh_token_hash: string; last_used_at: number }>
) => {
  if (!(sessionId in sessions)) return;
  Object.assign(sessions[sessionId], patch);
};
const deleteSession = async (sessionId: string) => {
  delete sessions[sessionId];
};
const deleteUserSessions = async (userId: string) => {
  for (const id of Object.keys(sessions)) {
    if (sessions[id].user_id === userId) delete sessions[id];
  }
};

const loadMetas = async () => {
  return Object.values(db.meta);
};
// Dummy meta rows match the sqlite3 `mapRow` shape: single-key
// record `{ [key]: value }` rather than `{ key, value }`. Mirrors
// sqlite3's UNIQUE-constraint behaviour — INSERT on a duplicate
// key throws.
const createMeta = async (meta: { key: string; value: string }) => {
  if (meta.key in db.meta) {
    throw new Error(`UNIQUE constraint failed: meta.key (${meta.key})`);
  }
  db.meta[meta.key] = { [meta.key]: meta.value };
};
const loadMeta = async (key: string) => {
  if (!(key in db.meta)) {
    throw new NotFoundError();
  }
  return db.meta[key];
};
const updateMeta = async (key: string, patch: { value?: string }) => {
  if (!(key in db.meta)) {
    throw new NotFoundError();
  }
  if (patch.value !== undefined) db.meta[key] = { [key]: patch.value };
};
const deleteMeta = async (key: string) => {
  if (!(key in db.meta)) {
    throw new NotFoundError();
  }
  delete db.meta[key];
};

const loadUsers = async () => {
  return Object.values(db.users);
};
const createUser = async (user: {
  id: string;
  name: string;
  password: string;
  secret: string;
}) => {
  db.users[user.id] = { ...user };
};
const loadUser = async (id: string) => {
  if (!(id in db.users)) {
    throw new NotFoundError();
  }
  return db.users[id];
};
const updateUser = async (userId: string, patch: Record<string, unknown>) => {
  if (!(userId in db.users)) {
    throw new NotFoundError();
  }
  Object.assign(db.users[userId], patch);
};
const deleteUser = async (id: string) => {
  if (!(id in db.users)) {
    throw new NotFoundError();
  }
  delete db.users[id];
};

type AclEntry = { is_editor: boolean; hide_map?: number | null };
type AclMap = Record<string, Record<string, AclEntry>>;

const loadUserGalleryRows = async (
  filter: { userId?: string; galleryId?: string } = {}
) => {
  const acl = (db.accessControl as AclMap) ?? {};
  const out: Array<{
    user_id: string;
    gallery_id: string;
    is_editor: number;
    hide_map: number | null;
  }> = [];
  for (const [userId, perGallery] of Object.entries(acl)) {
    if (filter.userId && filter.userId !== userId) continue;
    for (const [galleryId, entry] of Object.entries(perGallery)) {
      if (filter.galleryId && filter.galleryId !== galleryId) continue;
      out.push({
        user_id: userId,
        gallery_id: galleryId,
        is_editor: entry.is_editor ? 1 : 0,
        hide_map: entry.hide_map ?? null,
      });
    }
  }
  return out;
};
const deleteUserGallery = async (userId: string, galleryId: string) => {
  const acl = db.accessControl as AclMap;
  if (acl?.[userId]) {
    delete acl[userId][galleryId];
    if (Object.keys(acl[userId]).length === 0) delete acl[userId];
  }
};
const upsertUserGallery = async (row: {
  user_id: string;
  gallery_id: string;
  is_editor?: boolean;
  hide_map?: number | null;
}) => {
  const acl = (db.accessControl ??= {}) as AclMap;
  acl[row.user_id] ??= {};
  const existing = acl[row.user_id][row.gallery_id] ?? { is_editor: false };
  if ("is_editor" in row) existing.is_editor = !!row.is_editor;
  if ("hide_map" in row) existing.hide_map = row.hide_map;
  acl[row.user_id][row.gallery_id] = existing;
};

const groupRowsFor = (userId: string, galleryId: string): AclEntry[] => {
  const memberships = (db.userGroups as Record<string, string[]>)[userId] ?? [];
  const groupAcl = (db.groupAccessControl as AclMap) ?? {};
  const out: AclEntry[] = [];
  for (const groupId of memberships) {
    const row = groupAcl[groupId]?.[galleryId];
    if (row) out.push(row);
  }
  return out;
};

const resolveAccessLevel = async (
  userId: string,
  galleryId: string
): Promise<{ hasAccess: boolean; isEditor: boolean }> => {
  const user = db.users[userId] as { is_admin?: boolean } | undefined;
  if (user?.is_admin) return { hasAccess: true, isEditor: true };
  const acl = db.accessControl as AclMap;
  const userRow = acl[userId]?.[galleryId];
  const guestRow = acl[":guest"]?.[galleryId];
  const groupRows = groupRowsFor(userId, galleryId);
  if (!userRow && !guestRow && groupRows.length === 0) {
    return { hasAccess: false, isEditor: false };
  }
  const isEditor =
    !!userRow?.is_editor ||
    !!guestRow?.is_editor ||
    groupRows.some((r) => r.is_editor);
  return { hasAccess: true, isEditor };
};
const resolveHideMap = async (
  userId: string,
  galleryId: string
): Promise<number | undefined> => {
  const user = db.users[userId] as { is_admin?: boolean } | undefined;
  if (user?.is_admin) return 0;
  const acl = db.accessControl as AclMap;
  const userRow = acl[userId]?.[galleryId];
  if (userRow?.hide_map !== null && userRow?.hide_map !== undefined) {
    return userRow.hide_map;
  }
  // Group layer: privacy-first MAX (any "1" hides) over rows the user
  // inherits via group membership.
  const groupValues = groupRowsFor(userId, galleryId)
    .map((r) => r.hide_map)
    .filter((v): v is number => v === 0 || v === 1);
  if (groupValues.length > 0) return Math.max(...groupValues);
  const guestRow = acl[":guest"]?.[galleryId];
  if (guestRow?.hide_map !== null && guestRow?.hide_map !== undefined) {
    return guestRow.hide_map;
  }
  return undefined;
};

// Groups
type GroupShape = { id: string; name: string; description: string };
const groupRow = (input: {
  id: string;
  name?: string;
  description?: string;
}): GroupShape => ({
  id: input.id,
  name: input.name ?? "",
  description: input.description ?? "",
});
const loadGroups = async () => {
  const groups = (db.groups as Record<string, GroupShape>) ?? {};
  return Object.values(groups)
    .map(groupRow)
    .sort((a, b) => a.id.localeCompare(b.id));
};
const loadGroup = async (groupId: string) => {
  const groups = (db.groups ??= {}) as Record<string, GroupShape>;
  if (!(groupId in groups)) throw new NotFoundError();
  return groupRow(groups[groupId]);
};
const createGroup = async (group: {
  id: string;
  name?: string;
  description?: string;
}) => {
  const groups = (db.groups ??= {}) as Record<string, GroupShape>;
  groups[group.id] = groupRow(group);
};
const updateGroup = async (
  groupId: string,
  patch: Record<string, unknown>
) => {
  const groups = (db.groups ??= {}) as Record<string, Record<string, unknown>>;
  if (!(groupId in groups)) throw new NotFoundError();
  Object.assign(groups[groupId], patch);
};
const deleteGroup = async (groupId: string) => {
  const groups = (db.groups ??= {}) as Record<string, unknown>;
  delete groups[groupId];
  // Cascade — same as sqlite FK ON DELETE CASCADE.
  const userGroups = (db.userGroups ??= {}) as Record<string, string[]>;
  for (const userId of Object.keys(userGroups)) {
    userGroups[userId] = userGroups[userId].filter((g) => g !== groupId);
    if (userGroups[userId].length === 0) delete userGroups[userId];
  }
  const groupAcl = (db.groupAccessControl ??= {}) as AclMap;
  delete groupAcl[groupId];
};
const loadGroupMembers = async (groupId: string): Promise<string[]> => {
  const userGroups = (db.userGroups ??= {}) as Record<string, string[]>;
  return Object.keys(userGroups)
    .filter((u) => userGroups[u].includes(groupId))
    .sort();
};
const loadUserGroups = async (userId: string): Promise<string[]> => {
  const userGroups = (db.userGroups ??= {}) as Record<string, string[]>;
  return [...(userGroups[userId] ?? [])].sort();
};
const addUserGroup = async (userId: string, groupId: string) => {
  const userGroups = (db.userGroups ??= {}) as Record<string, string[]>;
  userGroups[userId] ??= [];
  if (!userGroups[userId].includes(groupId)) userGroups[userId].push(groupId);
};
const removeUserGroup = async (userId: string, groupId: string) => {
  const userGroups = (db.userGroups ??= {}) as Record<string, string[]>;
  if (!userGroups[userId]) return;
  userGroups[userId] = userGroups[userId].filter((g) => g !== groupId);
  if (userGroups[userId].length === 0) delete userGroups[userId];
};
const loadGroupGalleryRows = async (
  filter: { groupId?: string; galleryId?: string } = {}
) => {
  const acl = (db.groupAccessControl ??= {}) as AclMap;
  const out: Array<{
    group_id: string;
    gallery_id: string;
    is_editor: number;
    hide_map: number | null;
  }> = [];
  for (const [groupId, perGallery] of Object.entries(acl)) {
    if (filter.groupId && filter.groupId !== groupId) continue;
    for (const [galleryId, entry] of Object.entries(perGallery)) {
      if (filter.galleryId && filter.galleryId !== galleryId) continue;
      out.push({
        group_id: groupId,
        gallery_id: galleryId,
        is_editor: entry.is_editor ? 1 : 0,
        hide_map: entry.hide_map ?? null,
      });
    }
  }
  return out;
};
const upsertGroupGallery = async (row: {
  group_id: string;
  gallery_id: string;
  is_editor?: boolean;
  hide_map?: number | null;
}) => {
  const acl = (db.groupAccessControl ??= {}) as AclMap;
  acl[row.group_id] ??= {};
  const existing = acl[row.group_id][row.gallery_id] ?? { is_editor: false };
  if ("is_editor" in row) existing.is_editor = !!row.is_editor;
  if ("hide_map" in row) existing.hide_map = row.hide_map;
  acl[row.group_id][row.gallery_id] = existing;
};
const deleteGroupGallery = async (groupId: string, galleryId: string) => {
  const acl = (db.groupAccessControl ??= {}) as AclMap;
  if (!acl[groupId]) return;
  delete acl[groupId][galleryId];
  if (Object.keys(acl[groupId]).length === 0) delete acl[groupId];
};

const loadGalleries = async () => {
  return Object.values(db.galleries).sort();
};
const createGallery = async (gallery: { id: string }) => {
  db.galleries[gallery.id] = { ...gallery };
};
const loadGallery = async (galleryId: string) => {
  if (!(galleryId in db.galleries)) {
    throw new NotFoundError();
  }
  return db.galleries[galleryId];
};
const updateGallery = async (
  galleryId: string,
  patch: Record<string, unknown>
) => {
  if (!(galleryId in db.galleries)) {
    throw new NotFoundError();
  }
  Object.assign(db.galleries[galleryId], patch);
};
const deleteGallery = async (galleryId: string) => {
  if (!(galleryId in db.galleries)) {
    throw new NotFoundError();
  }
  delete db.galleries[galleryId];
};

const comparePhotos = (a: any, b: any) =>
  a.taken.instant.timestamp.localeCompare(b.taken.instant.timestamp);

const loadGalleryPhotos = async (galleryId: string, _lang?: string) => {
  if (!(galleryId in db.galleries)) {
    throw new NotFoundError();
  }
  return db.galleryPhotos[galleryId]
    .map((photoId: string) => db.photos[photoId])
    .sort(comparePhotos);
};
const linkGalleryPhoto = async (
  galleryIds: string[],
  photoIds: string[]
) => {
  for (const galleryId of galleryIds) {
    const existing = ((db.galleryPhotos as Record<string, string[]>)[
      galleryId
    ] ?? []) as string[];
    for (const photoId of photoIds) {
      if (!existing.includes(photoId)) existing.push(photoId);
    }
    (db.galleryPhotos as Record<string, string[]>)[galleryId] = existing;
  }
};
const loadGalleryPhoto = async (galleryId: string, photoId: string, _lang?: string) => {
  if (!(galleryId in db.galleries)) {
    throw new NotFoundError();
  }
  const photos = db.galleryPhotos[galleryId]
    .filter((id: string) => id === photoId)
    .map((id: string) => db.photos[id]);
  if (photos.length === 0) {
    throw new NotFoundError();
  }
  return photos[0];
};
const unlinkGalleryPhoto = async () => {
  throw new NotImplementedError();
};
const unlinkAllPhotos = async (galleryId: string) => {
  delete (db.galleryPhotos as Record<string, string[]>)[galleryId];
};
const unlinkAllGalleries = async (photoId: string) => {
  const galleryPhotos = db.galleryPhotos as Record<string, string[]>;
  for (const galleryId of Object.keys(galleryPhotos)) {
    galleryPhotos[galleryId] = galleryPhotos[galleryId].filter(
      (id) => id !== photoId
    );
  }
};
const loadAllGalleryPhotoLinks = async (): Promise<
  Array<{ galleryId: string; photoId: string }>
> => {
  const out: Array<{ galleryId: string; photoId: string }> = [];
  const galleryPhotos = (db.galleryPhotos ?? {}) as Record<string, string[]>;
  for (const [galleryId, photoIds] of Object.entries(galleryPhotos)) {
    for (const photoId of photoIds) out.push({ galleryId, photoId });
  }
  return out;
};

const loadPhotos = async () => {
  return db.photos;
};
const createPhoto = async (photo: { id?: string } & Record<string, unknown>) => {
  if (!db.photos) db.photos = {};
  if (photo.id) db.photos[photo.id] = photo;
};
const loadPhoto = async (photoId: string) => {
  if (!(photoId in db.photos)) {
    throw new NotFoundError();
  }
  return db.photos[photoId];
};
const loadPhotosByOriginalFilename = async (originalFilename: string) => {
  return Object.values(db.photos).filter(
    (p: any) => p.originalFilename === originalFilename
  );
};
const loadOrphanPhotoIds = async (): Promise<string[]> => {
  const linked = new Set<string>();
  for (const ids of Object.values(db.galleryPhotos) as string[][]) {
    for (const id of ids) linked.add(id);
  }
  return Object.keys(db.photos)
    .filter((id) => !linked.has(id))
    .sort();
};
const loadOrphanGalleryPhotoLinks = async () => {
  const out: Array<{
    galleryId: string;
    photoId: string;
    missing: "photo" | "gallery";
  }> = [];
  for (const [galleryId, photoIds] of Object.entries(db.galleryPhotos) as Array<
    [string, string[]]
  >) {
    const galleryMissing = !(galleryId in db.galleries);
    for (const photoId of photoIds) {
      if (galleryMissing) {
        out.push({ galleryId, photoId, missing: "gallery" });
      } else if (!(photoId in db.photos)) {
        out.push({ galleryId, photoId, missing: "photo" });
      }
    }
  }
  return out;
};
const loadEmptyGalleryIds = async (): Promise<string[]> => {
  return Object.keys(db.galleries as Record<string, unknown>)
    .filter(
      (id) => !((db.galleryPhotos as Record<string, string[]>)[id]?.length ?? 0)
    )
    .sort();
};
const loadOrphanUserGalleryRows = async () => {
  // Dummy stores access as `accessControl[userId][galleryId] = level`,
  // which is the same logical content as the sqlite3 `user_gallery`
  // table — flatten and check each (user, gallery) pair.
  const out: Array<{
    userId: string;
    galleryId: string;
    missing: "user" | "gallery";
  }> = [];
  const acl = (db.accessControl as Record<string, Record<string, number>>) ??
    {};
  for (const [userId, perGallery] of Object.entries(acl)) {
    for (const galleryId of Object.keys(perGallery)) {
      if (userId !== CONST.GUEST_USER && !(userId in db.users)) {
        out.push({ userId, galleryId, missing: "user" });
      } else if (!(galleryId in db.galleries)) {
        out.push({ userId, galleryId, missing: "gallery" });
      }
    }
  }
  return out;
};
// Deep-merge mirrors the sqlite3 driver's per-column update semantics:
// only keys present in `patch` are touched, nested objects merge instead
// of replacing wholesale. Object.assign-style shallow merge would let an
// EXIF-refresh update wipe operator-set country/place under
// `taken.location`.
const deepMerge = (target: any, source: any): void => {
  for (const key of Object.keys(source)) {
    const val = source[key];
    if (
      val !== null &&
      typeof val === "object" &&
      !Array.isArray(val)
    ) {
      if (!target[key] || typeof target[key] !== "object") {
        target[key] = {};
      }
      deepMerge(target[key], val);
    } else {
      target[key] = val;
    }
  }
};
const updatePhoto = async (photoId: string, patch: Record<string, unknown>) => {
  if (!(photoId in db.photos)) {
    throw new NotFoundError();
  }
  deepMerge(db.photos[photoId], patch);
};
const deletePhoto = async (photoId: string) => {
  if (!(photoId in db.photos)) {
    throw new NotFoundError();
  }
  delete db.photos[photoId];
};
// Geocoded fields — English-canonical lives on the photo "row";
// other languages live in db.photoLocalized keyed by (photo_id, lang).
const upsertGeocoded = async (
  photoId: string,
  lang: string,
  fields: Record<string, unknown>
) => {
  if (!(photoId in db.photos)) return;
  if (lang === "en") {
    db.photos[photoId].geocoded = db.photos[photoId].geocoded || {};
    Object.assign(db.photos[photoId].geocoded, fields);
    // Auto-fill operator country from geocoded when empty.
    if (
      fields.countryCode &&
      !db.photos[photoId].taken?.location?.country
    ) {
      db.photos[photoId].taken = db.photos[photoId].taken || {};
      db.photos[photoId].taken.location = db.photos[photoId].taken.location || {};
      db.photos[photoId].taken.location.country = fields.countryCode;
    }
    return;
  }
  if (!db.photoLocalized) db.photoLocalized = {};
  const key = `${photoId}:${lang}`;
  const merged = { ...(db.photoLocalized[key] ?? {}), ...fields };
  if (
    typeof merged.city === "string" &&
    !acceptLocalizedCity(merged.city, lang)
  ) {
    merged.city = null;
  }
  db.photoLocalized[key] = merged;
};
const markGeocodeNoData = async (photoId: string): Promise<void> => {
  if (!(photoId in db.photos)) return;
  db.photos[photoId].geocodeNoData = true;
};
const clearGeocoded = async (photoId: string): Promise<void> => {
  if (!(photoId in db.photos)) return;
  delete db.photos[photoId].geocoded;
  db.photos[photoId].geocodeNoData = false;
  if (!db.photoLocalized) return;
  for (const key of Object.keys(db.photoLocalized)) {
    if (key.startsWith(`${photoId}:`)) {
      const row = db.photoLocalized[key];
      if (row && typeof row === "object") row.city = null;
    }
  }
};
const loadPhotosMissingGeocoded = async (
  lang: string,
  limit: number
): Promise<Array<{ id: string; lat: number; lon: number }>> => {
  const out: Array<{ id: string; lat: number; lon: number }> = [];
  for (const [id, photo] of Object.entries(db.photos) as Array<[string, any]>) {
    const lat = photo.taken?.location?.coordinates?.latitude;
    const lon = photo.taken?.location?.coordinates?.longitude;
    if (lat === null || lat === undefined) continue;
    if (lon === null || lon === undefined) continue;
    if (photo.geocodeNoData) continue;
    const hasEn = !!photo.geocoded?.city;
    const hasLocalized =
      lang === "en"
        ? hasEn
        : !!db.photoLocalized?.[`${id}:${lang}`]?.city;
    if (!hasLocalized) out.push({ id, lat, lon });
    if (out.length >= limit) break;
  }
  return out;
};

const loadPhotoLocalized = async (
  lang: string
): Promise<Array<{ photo_id: string; geocoded_city: string | null }>> => {
  const out: Array<{ photo_id: string; geocoded_city: string | null }> = [];
  if (!db.photoLocalized) return out;
  const suffix = `:${lang}`;
  for (const [key, row] of Object.entries(db.photoLocalized) as Array<
    [string, any]
  >) {
    if (!key.endsWith(suffix)) continue;
    out.push({
      photo_id: key.slice(0, -suffix.length),
      geocoded_city: row?.city ?? null,
    });
  }
  return out;
};

const clearLocalizedCity = async (
  photoId: string,
  lang: string
): Promise<void> => {
  if (!db.photoLocalized) return;
  const row = db.photoLocalized[`${photoId}:${lang}`];
  if (row) row.city = null;
};

const renamePhoto = async (oldId: string, newId: string) => {
  if (!(oldId in db.photos)) {
    throw new NotFoundError();
  }
  db.photos[newId] = { ...db.photos[oldId], id: newId };
  delete db.photos[oldId];
  // gallery_photo lives in dbDump as `{ galleryId: [photoId, ...] }`.
  for (const galleryId of Object.keys(db.galleryPhotos)) {
    db.galleryPhotos[galleryId] = db.galleryPhotos[galleryId].map((id: string) =>
      id === oldId ? newId : id
    );
  }
};

const dbDump = JSON.stringify({
  meta: {
    schema_version: { schema_version: "1" },
    instance_name: { instance_name: "dummy instance" },
    instance_description: {
      instance_description: "dummy instance for automated tests",
    },
    instance_cdn: { instance_cdn: "http://localhost" },
    instance_image: { instance_image: "dummy.jpg" },
  },
  users: {
    admin: {
      id: "admin",
      name: "admin",
      password: "$2b$10$7edID90/TmAdhGtJRqjDj.hBzXEJZorgDYZ9jwPcdDdqceYlaQ2ZG",
      secret: randomUUID(),
      is_admin: true,
    },
    gallery1admin: {
      id: "gallery1admin",
      name: "gallery1admin",
      password: "$2b$10$7edID90/TmAdhGtJRqjDj.hBzXEJZorgDYZ9jwPcdDdqceYlaQ2ZG",
      secret: randomUUID(),
      is_admin: false,
    },
    gallery2admin: {
      id: "gallery2admin",
      name: "gallery2admin",
      password: "$2b$10$7edID90/TmAdhGtJRqjDj.hBzXEJZorgDYZ9jwPcdDdqceYlaQ2ZG",
      secret: randomUUID(),
      is_admin: false,
    },
    gallery1user: {
      id: "gallery1user",
      name: "gallery1user",
      password: "$2b$10$7edID90/TmAdhGtJRqjDj.hBzXEJZorgDYZ9jwPcdDdqceYlaQ2ZG",
      secret: randomUUID(),
      is_admin: false,
    },
    gallery12user: {
      id: "gallery12user",
      name: "gallery12user",
      password: "$2b$10$7edID90/TmAdhGtJRqjDj.hBzXEJZorgDYZ9jwPcdDdqceYlaQ2ZG",
      secret: randomUUID(),
      is_admin: false,
    },
    plainuser: {
      id: "plainuser",
      name: "plainuser",
      password: "$2b$10$7edID90/TmAdhGtJRqjDj.hBzXEJZorgDYZ9jwPcdDdqceYlaQ2ZG",
      secret: randomUUID(),
      is_admin: false,
    },
    publicuser: {
      id: "publicuser",
      name: "publicuser",
      password: "$2b$10$7edID90/TmAdhGtJRqjDj.hBzXEJZorgDYZ9jwPcdDdqceYlaQ2ZG",
      secret: randomUUID(),
      is_admin: false,
    },
    simpleuser: {
      id: "simpleuser",
      name: "simpleuser",
      password: "$2b$10$7edID90/TmAdhGtJRqjDj.hBzXEJZorgDYZ9jwPcdDdqceYlaQ2ZG",
      secret: randomUUID(),
      is_admin: false,
    },
    blockeduser: {
      id: "blockeduser",
      name: "blockeduser",
      password: "$2b$10$7edID90/TmAdhGtJRqjDj.hBzXEJZorgDYZ9jwPcdDdqceYlaQ2ZG",
      secret: randomUUID(),
      is_admin: false,
    },
  },
  // Per-(user, gallery) positive grants. Row presence = VIEW;
  // is_editor upgrades to gallery editor. The model has no
  // NONE rows — revoke is "delete the row." `admin` user is
  // global admin (is_admin flag on the user table), so no
  // rows here.
  accessControl: {
    gallery1admin: {
      gallery1: { is_editor: true },
    },
    gallery2admin: {
      gallery2: { is_editor: true },
    },
    gallery1user: {
      gallery1: { is_editor: false },
    },
    gallery12user: {
      gallery1: { is_editor: false },
      gallery2: { is_editor: false },
    },
    // plainuser and publicuser previously used the `:all` / `:public`
    // wildcard rows. The current equivalent is explicit per-gallery
    // grants on every real gallery in the fixture.
    plainuser: {
      gallery1: { is_editor: false },
      gallery2: { is_editor: false },
      gallery3: { is_editor: false },
    },
    publicuser: {
      gallery1: { is_editor: false },
      gallery2: { is_editor: false },
      gallery3: { is_editor: false },
    },
    simpleuser: {},
    blockeduser: {},
    ":guest": {
      gallery3: { is_editor: false },
    },
  },
  // Empty by default; tests that exercise groups seed via the model
  // calls. Keeps the dummy state predictable for the broader suite.
  groups: {},
  userGroups: {},
  groupAccessControl: {},
  galleries: {
    gallery1: {
      id: "gallery1",
      title: "gallery 1",
      description: "This is the first gallery",
      theme: "",
    },
    gallery2: {
      id: "gallery2",
      title: "gallery 2",
      description: "This is the second gallery",
      theme: "blue",
    },
    gallery3: {
      id: "gallery3",
      title: "gallery 3",
      description: "This is the third gallery",
      theme: "grayscale",
    },
  },
  photos: {
    "gallery1photo.jpg": {
      id: "gallery1photo.jpg",
      index: 0,
      title: "",
      description: "",
      taken: {
        instant: {
          timestamp: "2018-05-04 13:13:03",
          year: 2018,
          month: 5,
          day: 4,
          hour: 13,
          minute: 13,
          second: 3,
        },
        author: "Ville Misaki",
        location: {
          country: "jp",
          place: "",
          coordinates: {
            latitude: 35.6595,
            longitude: 139.7005,
            altitude: 36.5,
          },
        },
      },
      camera: { make: "FUJIFILM", model: "X-T2", serial: "123" },
      lens: { make: "FUJIFILM", model: "XF27mmF2.8", serial: "456" },
      exposure: {
        focalLength: 27,
        focalLength35mmEquiv: 41,
        aperture: 5.6,
        exposureTime: 0.0008,
        iso: 200,
      },
      dimensions: {
        original: { width: 6000, height: 4000 },
        display: { width: 1500, height: 1000 },
        thumbnail: { width: 150, height: 100 },
      },
    },
    "gallery12photo.jpg": {
      id: "gallery12photo.jpg",
      index: 1,
      title: "",
      description: "",
      taken: {
        instant: {
          timestamp: "2020-07-04 14:13:03",
          year: 2020,
          month: 7,
          day: 4,
          hour: 14,
          minute: 13,
          second: 3,
        },
        author: "Ville Misaki",
        location: {
          country: "nl",
          place: "",
          coordinates: {
            latitude: undefined,
            longitude: undefined,
            altitude: undefined,
          },
        },
      },
      camera: { make: "Panasonic", model: "DMC-GX7", serial: undefined },
      lens: {
        make: undefined,
        model: "LUMIX G 20/F1.7 II",
        serial: "04JG3165007",
      },
      exposure: {
        focalLength: 20,
        focalLength35mmEquiv: 40,
        aperture: 1.7,
        exposureTime: 0.0006666666666666666,
        iso: 200,
      },
      dimensions: {
        original: { width: 6000, height: 4000 },
        display: { width: 1500, height: 1000 },
        thumbnail: { width: 150, height: 100 },
      },
    },
    "gallery2photo.jpg": {
      id: "gallery2photo.jpg",
      index: 2,
      title: "",
      description: "",
      taken: {
        instant: {
          timestamp: "2020-07-05 14:13:03",
          year: 2020,
          month: 7,
          day: 5,
          hour: 14,
          minute: 13,
          second: 3,
        },
        author: "Ville Misaki",
        location: {
          country: "jp",
          place: "",
          coordinates: {
            latitude: undefined,
            longitude: undefined,
            altitude: undefined,
          },
        },
      },
      camera: { make: "FUJIFILM", model: "X-T2", serial: "111" },
      lens: { make: "FUJIFILM", model: "XF27mmF2.8", serial: "222" },
      exposure: {
        focalLength: 27,
        focalLength35mmEquiv: 41,
        aperture: 5.6,
        exposureTime: 0.0008,
        iso: 200,
      },
      dimensions: {
        original: { width: 6000, height: 4000 },
        display: { width: 1500, height: 1000 },
        thumbnail: { width: 150, height: 100 },
      },
    },
    "gallery3photo.jpg": {
      id: "gallery3photo.jpg",
      index: 3,
      title: "",
      description: "",
      taken: {
        instant: {
          timestamp: "2020-07-05 14:13:04",
          year: 2020,
          month: 7,
          day: 6,
          hour: 14,
          minute: 13,
          second: 4,
        },
        author: "Ville Misaki",
        location: {
          country: "jp",
          place: "",
          coordinates: {
            latitude: undefined,
            longitude: undefined,
            altitude: undefined,
          },
        },
      },
      camera: { make: "FUJIFILM", model: "X-T2", serial: "111" },
      lens: { make: "FUJIFILM", model: "XF27mmF2.8", serial: "222" },
      exposure: {
        focalLength: 27,
        focalLength35mmEquiv: 41,
        aperture: 5.6,
        exposureTime: 0.0008,
        iso: 200,
      },
      dimensions: {
        original: { width: 6000, height: 4000 },
        display: { width: 1500, height: 1000 },
        thumbnail: { width: 150, height: 100 },
      },
    },
    "orphanphoto.jpg": {
      id: "orphanphoto.jpg",
      index: 4,
      title: "",
      description: "",
      taken: {
        instant: {
          timestamp: "2020-08-05 14:13:03",
          year: 2020,
          month: 8,
          day: 5,
          hour: 14,
          minute: 13,
          second: 3,
        },
        author: "Ville Misaki",
        location: {
          country: "fi",
          place: "",
          coordinates: {
            latitude: undefined,
            longitude: undefined,
            altitude: undefined,
          },
        },
      },
      camera: { make: "FUJIFILM", model: "X100F", serial: "123456" },
      lens: { make: undefined, model: undefined, serial: undefined },
      exposure: {
        focalLength: 23,
        focalLength35mmEquiv: undefined,
        aperture: 5.6,
        exposureTime: 0.0005263157894736842,
        iso: 200,
      },
      dimensions: { width: 6000, height: 4000 },
    },
  },
  galleryPhotos: {
    gallery1: ["gallery1photo.jpg", "gallery12photo.jpg"],
    gallery2: ["gallery12photo.jpg", "gallery2photo.jpg"],
    gallery3: ["gallery3photo.jpg"],
  },
});
init();
