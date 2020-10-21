const CONST = require("./constants.cjs");
const db = require("../db/index.cjs");

module.exports = () => {
  return {
    authorizeView,
    authorizeAdmin,
    authorizeGalleryView,
    authorizeGalleryAdmin,
  };
};

const authorizeView = async (userId) => {
  try {
    const acl = await db.loadUserAccessControl(userId);
    await authorizeViewDirect(acl);
  } catch (error) {
    throw CONST.ERROR_ACCESS;
  }
};
const authorizeAdmin = async (userId) => {
  try {
    const acl = await db.loadUserAccessControl(userId);
    await authorizeAdminDirect(acl);
  } catch (error) {
    throw CONST.ERROR_ACCESS;
  }
};
const authorizeGalleryView = async (userId, galleryId) => {
  try {
    const acl = await db.loadUserAccessControl(userId);
    return await authorizeGalleryViewDirect(acl, galleryId);
  } catch (error) {
    throw CONST.ERROR_ACCESS;
  }
};
const authorizeGalleryAdmin = async (userId, galleryId) => {
  try {
    const acl = await db.loadUserAccessControl(userId);
    return await authorizeGalleryAdminDirect(acl, galleryId);
  } catch (error) {
    throw CONST.ERROR_ACCESS;
  }
};

const authorizeViewDirect = async (acl) => {
  const all = CONST.SPECIAL_GALLERY_ALL;
  if (!(all in acl)) {
    throw CONST.ERROR_ACCESS;
  }
  if (acl[all] < CONST.ACCESS_VIEW) {
    throw CONST.ERROR_ACCESS;
  }
};
const authorizeAdminDirect = async (acl) => {
  const all = CONST.SPECIAL_GALLERY_ALL;
  if (!(all in acl)) {
    throw CONST.ERROR_ACCESS;
  }
  if (acl[all] < CONST.ACCESS_ADMIN) {
    throw CONST.ERROR_ACCESS;
  }
};
const authorizeGalleryViewDirect = async (acl, galleryId) => {
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
const authorizeGalleryAdminDirect = async (acl, galleryId) => {
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
