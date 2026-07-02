import logger from "../lib/logger.js";
import db from "../db/index.js";

export default () => {
  return {
    init,
    getMetas,
    getMeta,
    createMeta,
    updateMeta,
    upsertMeta,
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
// Create-or-update. The HTTP PUT endpoint uses this so a brand-new
// key (e.g. instance_knownHosts on a fresh install, before the
// operator has ever set it) persists through the admin UI on the
// first save. Try INSERT first; on the driver's UNIQUE-constraint
// error, fall through to UPDATE. Any other error rethrows.
const upsertMeta = async (meta: { key: string; value: string }) => {
  logger.debug("Upserting meta", meta);
  try {
    await db.createMeta(meta);
  } catch (err) {
    const code = (err as { code?: string } | undefined)?.code;
    if (code === "SQLITE_CONSTRAINT_PRIMARYKEY") {
      await db.updateMeta(meta.key, { value: meta.value });
      return;
    }
    throw err;
  }
};
const deleteMeta = async (key: string) => {
  logger.debug("Deleting meta", key);
  await db.deleteMeta(key);
};
