import CONST from "./constants.js";
import db from "../db/index.js";

export default () => {
  return {
    authorizeView,
    authorizeAdmin,
    authorizeGalleryView,
    authorizeGalleryAdmin,
  };
};

// All four checks share the same shape: ask the driver for the effective
// access level under the user-first cascade (see `resolveAccessLevel` in
// db/sqlite3/index.ts), compare to the required threshold, throw on miss.
// Catch-all so any underlying error (DB miss, etc.) reads as a uniform
// ERROR_ACCESS to callers rather than leaking driver-specific failures.

const requireLevel = async (
  userId: string,
  galleryId: string,
  required: number
): Promise<void> => {
  try {
    const level = await db.resolveAccessLevel(userId, galleryId);
    if (level === undefined || level < required) {
      throw CONST.ERROR_ACCESS;
    }
  } catch {
    throw CONST.ERROR_ACCESS;
  }
};

const authorizeView = (userId: string): Promise<void> =>
  requireLevel(userId, CONST.SPECIAL_GALLERY_ALL, CONST.ACCESS_VIEW);

const authorizeAdmin = (userId: string): Promise<void> =>
  requireLevel(userId, CONST.SPECIAL_GALLERY_ALL, CONST.ACCESS_ADMIN);

const authorizeGalleryView = async (
  userId: string,
  galleryId: string
): Promise<string> => {
  await requireLevel(userId, galleryId, CONST.ACCESS_VIEW);
  return galleryId;
};

const authorizeGalleryAdmin = async (
  userId: string,
  galleryId: string
): Promise<string> => {
  await requireLevel(userId, galleryId, CONST.ACCESS_ADMIN);
  return galleryId;
};
