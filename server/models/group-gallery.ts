import logger from "../lib/logger.js";
import db from "../db/index.js";

export default () => {
  return {
    init,
    getGroupGalleryRows,
    upsertGroupGallery,
    deleteGroupGallery,
  };
};

const init = async () => {};

const getGroupGalleryRows = async (filter: {
  groupId?: string;
  galleryId?: string;
}) => await db.loadGroupGalleryRows(filter);

const upsertGroupGallery = async (row: {
  group_id: string;
  gallery_id: string;
  is_editor?: boolean;
  hide_map?: number | null;
  can_see_private?: boolean;
}) => {
  logger.debug("Upserting group_gallery", row);
  await db.upsertGroupGallery(row);
};

const deleteGroupGallery = async (groupId: string, galleryId: string) => {
  logger.debug("Deleting group_gallery", { groupId, galleryId });
  await db.deleteGroupGallery(groupId, galleryId);
};
