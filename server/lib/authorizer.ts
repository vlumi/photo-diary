import CONST from "./constants.js";
import db from "../db/index.js";

type Acl = Record<string, number>;

export default () => {
  return {
    authorizeView,
    authorizeAdmin,
    authorizeGalleryView,
    authorizeGalleryAdmin,
  };
};

const authorizeView = async (userId: string): Promise<void> => {
  try {
    const acl = await db.loadUserAccessControl(userId);
    await authorizeViewDirect(acl);
  } catch {
    throw CONST.ERROR_ACCESS;
  }
};
const authorizeAdmin = async (userId: string): Promise<void> => {
  try {
    const acl = await db.loadUserAccessControl(userId);
    await authorizeAdminDirect(acl);
  } catch {
    throw CONST.ERROR_ACCESS;
  }
};
const authorizeGalleryView = async (
  userId: string,
  galleryId: string
): Promise<string> => {
  try {
    const acl = await db.loadUserAccessControl(userId);
    return await authorizeGalleryViewDirect(acl, galleryId);
  } catch {
    throw CONST.ERROR_ACCESS;
  }
};
const authorizeGalleryAdmin = async (
  userId: string,
  galleryId: string
): Promise<string> => {
  try {
    const acl = await db.loadUserAccessControl(userId);
    return await authorizeGalleryAdminDirect(acl, galleryId);
  } catch {
    throw CONST.ERROR_ACCESS;
  }
};

const authorizeViewDirect = async (acl: Acl): Promise<void> => {
  const all = CONST.SPECIAL_GALLERY_ALL;
  if (!(all in acl)) {
    throw CONST.ERROR_ACCESS;
  }
  if (acl[all] < CONST.ACCESS_VIEW) {
    throw CONST.ERROR_ACCESS;
  }
};
const authorizeAdminDirect = async (acl: Acl): Promise<void> => {
  const all = CONST.SPECIAL_GALLERY_ALL;
  if (!(all in acl)) {
    throw CONST.ERROR_ACCESS;
  }
  if (acl[all] < CONST.ACCESS_ADMIN) {
    throw CONST.ERROR_ACCESS;
  }
};
const authorizeGalleryViewDirect = async (
  acl: Acl,
  galleryId: string
): Promise<string> => {
  if (!(galleryId in acl)) {
    if (!CONST.isSpecialGallery(galleryId)) {
      await authorizeGalleryViewDirect(acl, CONST.SPECIAL_GALLERY_PUBLIC);
    } else {
      await authorizeViewDirect(acl);
    }
    return galleryId;
  }
  if (acl[galleryId] < CONST.ACCESS_VIEW) {
    throw CONST.ERROR_ACCESS;
  }
  return galleryId;
};
const authorizeGalleryAdminDirect = async (
  acl: Acl,
  galleryId: string
): Promise<string> => {
  if (!(galleryId in acl)) {
    if (!CONST.isSpecialGallery(galleryId)) {
      await authorizeGalleryAdminDirect(acl, CONST.SPECIAL_GALLERY_PUBLIC);
    } else {
      await authorizeAdminDirect(acl);
    }
    return galleryId;
  }
  if (acl[galleryId] < CONST.ACCESS_ADMIN) {
    throw CONST.ERROR_ACCESS;
  }
  return galleryId;
};
