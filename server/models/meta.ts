import { setCspCdn } from "../lib/csp.js";
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
// Any write to `instance_cdn` needs to reach the live CSP cache
// so the img-src allowlist picks up the new origin without a pm2
// restart. Centralised here so every write path (create / update /
// upsert / delete) does the refresh consistently.
const notifyCspOnCdnWrite = (key: string, value: string | undefined): void => {
  if (key !== "instance_cdn") return;
  setCspCdn(value);
};

const createMeta = async (meta: { key: string; value: string }) => {
  logger.debug("Creating meta", meta);
  await db.createMeta(meta);
  notifyCspOnCdnWrite(meta.key, meta.value);
};
const updateMeta = async (key: string, value: string) => {
  logger.debug("Updating meta", { key, value });
  await db.updateMeta(key, { value });
  notifyCspOnCdnWrite(key, value);
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
      notifyCspOnCdnWrite(meta.key, meta.value);
      return;
    }
    throw err;
  }
  notifyCspOnCdnWrite(meta.key, meta.value);
};
const deleteMeta = async (key: string) => {
  logger.debug("Deleting meta", key);
  await db.deleteMeta(key);
  notifyCspOnCdnWrite(key, undefined);
};
