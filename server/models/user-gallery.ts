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
  is_editor?: boolean;
  hide_map?: number | null;
  can_see_private?: boolean;
}) => {
  logger.debug("Upserting user_gallery", row);
  await db.upsertUserGallery(row);
};

const deleteUserGallery = async (userId: string, galleryId: string) => {
  logger.debug("Deleting user_gallery", { userId, galleryId });
  await db.deleteUserGallery(userId, galleryId);
};
