/* eslint-disable @typescript-eslint/no-explicit-any */
import CONST from "../lib/constants.js";
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
const createMeta = async (meta: Record<string, any>) => {
  logger.debug("Creating meta", meta);
  throw CONST.ERROR_NOT_IMPLEMENTED;
};
const updateMeta = async (meta: Record<string, any>) => {
  logger.debug("Updating meta", meta);
  throw CONST.ERROR_NOT_IMPLEMENTED;
};
const deleteMeta = async (key: string) => {
  logger.debug("Deleting meta", key);
  throw CONST.ERROR_NOT_IMPLEMENTED;
};
