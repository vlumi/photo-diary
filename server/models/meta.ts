import logger from "../lib/logger.js";
import db from "../db/index.js";

export default () => {
  return {
    init,
    getMetas,
    getMeta,
    createMeta,
    updateMeta,
    deleteMeta,
  };
};

const init = async () => {};

const getMetas = async () => {
  return await db.loadMetas();
};
const getMeta = async (key: string) => {
  return await db.loadMeta(key);
};
const createMeta = async (meta: { key: string; value: string }) => {
  logger.debug("Creating meta", meta);
  await db.createMeta(meta);
};
const updateMeta = async (key: string, value: string) => {
  logger.debug("Updating meta", { key, value });
  await db.updateMeta(key, { value });
};
const deleteMeta = async (key: string) => {
  logger.debug("Deleting meta", key);
  await db.deleteMeta(key);
};
