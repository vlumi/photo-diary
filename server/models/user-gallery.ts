import logger from "../lib/logger.js";
import db from "../db/index.js";

export default () => {
  return {
    init,
    getUserGalleryRows,
    upsertUserGallery,
    deleteUserGallery,
  };
};

const init = async () => {};

const getUserGalleryRows = async (filter: {
  userId?: string;
  galleryId?: string;
}) => {
  return await db.loadUserGalleryRows(filter);
};

const upsertUserGallery = async (row: {
  user_id: string;
  gallery_id: string;
  access_level?: number | null;
  hide_map?: number | null;
}) => {
  logger.debug("Upserting user_gallery", row);
  await db.upsertUserGallery(row);
};

const deleteUserGallery = async (userId: string, galleryId: string) => {
  logger.debug("Deleting user_gallery", { userId, galleryId });
  await db.deleteUserGallery(userId, galleryId);
};
