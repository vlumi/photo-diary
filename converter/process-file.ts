import fs from "node:fs";
import path from "node:path";

import db from "photo-diary-server/db/index.js";

import { DIR_INBOX, DIR_ORIGINAL, TARGETS } from "./lib/constants.js";
import * as logger from "./lib/logger.js";
import extractProperties from "./extract-properties/index.js";
import saveJson from "./extract-properties/save-json.js";
import convertImage from "./convert-image/index.js";
import generateId from "./generate-id.js";

export default async (
  originalFilename: string,
  rootDir: string
): Promise<void> => {
  const originalPath = path.join(rootDir, DIR_INBOX, originalFilename);
  const stat = await fs.promises.stat(originalPath);
  if (stat.size === 0) {
    throw `[${originalFilename}] Skipping empty file`;
  }

  const hrstart = process.hrtime();
  logger.debug(`[${originalFilename}] Processing`);

  // Rename to a stable id at intake: <YYYY-MM-DDTHH-MM-SS>-<short-uuid>.<ext>
  // from EXIF DateTimeOriginal (fallback mtime). The rest of the pipeline
  // operates on the new id; the original camera filename is preserved on
  // the DB row's originalFilename so enrichment JSONs and `bin/photo.ts
  // search` can still find the photo by the human-recognised name.
  const id = await generateId(originalPath);
  const newInboxPath = path.join(rootDir, DIR_INBOX, id);
  await fs.promises.rename(originalPath, newInboxPath);
  logger.debug(`[${originalFilename}] Renamed inbox file to ${id}`);

  await Promise.all(
    TARGETS.map((target) => convertImage(id, rootDir, target))
  );

  const properties = await extractProperties(id, rootDir);
  properties.originalFilename = originalFilename;
  await saveJson(id, rootDir, properties);

  // Minimal DB row at intake. Skip-if-exists so re-imports don't
  // clobber prior enrichment — unreachable with the timestamp+uuid
  // id scheme but kept as belt-and-braces.
  const existing = await db
    .loadPhoto(id)
    .then(() => true)
    .catch(() => false);
  if (existing) {
    logger.debug(`[${originalFilename}] DB row already exists for ${id}; skipping insert`);
  } else {
    await db.createPhoto(properties);
    logger.debug(`[${originalFilename}] Created DB row for ${id}`);
  }

  logger.debug(`[${originalFilename}] Moving file`);
  await fs.promises.rename(
    newInboxPath,
    path.join(rootDir, DIR_ORIGINAL, id)
  );

  const hrend = process.hrtime(hrstart);
  const elapsedSeconds =
    Math.round(hrend[0] * 1000 + hrend[1] / 1000000) / 1000;
  logger.info(`[${originalFilename}] Processed as ${id}, elapsed ${elapsedSeconds}s`);
};
