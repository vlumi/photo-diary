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
  // operates on this id; the original camera filename is preserved on
  // the DB row's originalFilename so enrichment JSONs and `bin/photo.ts
  // search` can still find the photo by the human-recognised name.
  const generated = await generateId(originalPath);
  const exifTimestamp = generated.exifTimestamp;

  // Reuse-existing-row detection. Two cases:
  //
  //   1. Re-import — a row with the same originalFilename AND EXIF
  //      DateTimeOriginal exists. Lightroom re-export of the same shot;
  //      overwrite files in place.
  //   2. JSON-first stub — a row with the same originalFilename but
  //      empty `taken`. The operator ran `bin/photo.ts <coords.json>`
  //      before the SOOC arrived; merge so coords + factual EXIF land
  //      on a single row instead of two.
  //
  // EXIF-derived fields on the row refresh below, but opinion fields
  // (title, country, place, author, description) stay — `photoMapToRow`
  // only writes keys present in the input, so unmentioned columns
  // aren't touched. EXIF-less re-imports still create new rows
  // (mtime isn't strong enough to be confident).
  let id = generated.id;
  let isReimport = false;
  const candidates = (await db.loadPhotosByOriginalFilename(
    originalFilename
  )) as Array<{ id: string; taken?: { instant?: { timestamp?: string } } }>;
  let matched: { id: string } | undefined;
  if (exifTimestamp) {
    matched = candidates.find(
      (c) => c.taken?.instant?.timestamp === exifTimestamp
    );
  }
  if (!matched) {
    // Stub: row's `taken` is empty (NULL in DB → "" through mapRow).
    // "Invalid date" rows (EXIF-less imports the converter produced)
    // stay distinct — we can't be confident they're the same photo.
    const stubs = candidates.filter(
      (c) => !c.taken?.instant?.timestamp
    );
    if (stubs.length === 1) {
      matched = stubs[0];
      logger.info(
        `[${originalFilename}] Merging onto JSON-first row ${matched.id} (enrichment arrived before the SOOC); opinion fields preserved`
      );
    }
  } else {
    logger.info(
      `[${originalFilename}] Re-importing onto existing id ${matched.id} (same originalFilename + EXIF DateTimeOriginal); opinion fields preserved`
    );
  }
  if (matched) {
    id = matched.id;
    isReimport = true;
  }

  const newInboxPath = path.join(rootDir, DIR_INBOX, id);
  await fs.promises.rename(originalPath, newInboxPath);
  logger.debug(`[${originalFilename}] Renamed inbox file to ${id}`);

  await Promise.all(
    TARGETS.map((target) => convertImage(id, rootDir, target))
  );

  const properties = await extractProperties(id, rootDir);
  properties.originalFilename = originalFilename;
  await saveJson(id, rootDir, properties);

  if (isReimport) {
    // Refresh EXIF-derived fields. `photoMapToRow` only writes keys
    // present in `properties`, so opinion columns (title, country,
    // place, author, description) keep their prior values.
    const update = { ...properties };
    delete update.id;
    await db.updatePhoto(id, update);
    logger.debug(`[${originalFilename}] Refreshed DB row ${id}`);
  } else {
    await db.createPhoto(properties);
    logger.debug(`[${originalFilename}] Created DB row ${id}`);
  }

  logger.debug(`[${originalFilename}] Moving file`);
  // fs.rename overwrites on POSIX; deliberately replaces the prior
  // original/<id>.jpg when re-importing.
  await fs.promises.rename(
    newInboxPath,
    path.join(rootDir, DIR_ORIGINAL, id)
  );

  const hrend = process.hrtime(hrstart);
  const elapsedSeconds =
    Math.round(hrend[0] * 1000 + hrend[1] / 1000000) / 1000;
  logger.info(`[${originalFilename}] Processed as ${id}, elapsed ${elapsedSeconds}s`);
};
