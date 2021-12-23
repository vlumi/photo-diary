const CONST = require("../lib/constants");
const logger = require("../lib/logger");
const db = require("../db");

module.exports = () => {
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
const getMeta = async (key) => {
  return await db.loadMeta(key);
};
const createMeta = async (meta) => {
  logger.debug("Creating meta", meta);
  throw CONST.ERROR_NOT_IMPLEMENTED;
};
const updateMeta = async (meta) => {
  logger.debug("Updating meta", meta);
  throw CONST.ERROR_NOT_IMPLEMENTED;
};
const deleteMeta = async (key) => {
  logger.debug("Deleting meta", key);
  throw CONST.ERROR_NOT_IMPLEMENTED;
};
