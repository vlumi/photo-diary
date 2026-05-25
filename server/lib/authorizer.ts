import CONST from "./constants.js";
import { AccessError } from "./errors.js";
import db from "../db/index.js";

export default () => {
  return {
    authorizeView,
    authorizeAdmin,
    authorizeGalleryView,
    authorizeGalleryAdmin,
  };
};

// Catch-all so driver-specific failures surface as a uniform AccessError.
const requireLevel = async (
  userId: string,
  galleryId: string,
  required: number
): Promise<void> => {
  try {
    const level = await db.resolveAccessLevel(userId, galleryId);
    if (level === undefined || level < required) {
      throw new AccessError(undefined, { userId, galleryId, required });
    }
  } catch (e) {
    if (e instanceof AccessError) throw e;
    throw new AccessError(undefined, { userId, galleryId, required });
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
