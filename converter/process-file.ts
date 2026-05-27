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

  // Reuse-existing-row detection: a row whose originalFilename AND
  // taken.instant.timestamp both match the incoming SOOC's EXIF
  // DateTimeOriginal. Covers two operator flows:
  //
  //   1. Lightroom re-export — operator edits an existing photo,
  //      re-publishes, drops the new SOOC. Same shot, same EXIF;
  //      overwrite display/thumbnail/original/sidecar in place,
  //      refresh the row's EXIF-derived columns.
  //   2. JSON-first stub — operator's enrichment JSON (with the
  //      photo's capture timestamp) arrived before the SOOC; the
  //      timestamp match links them on intake.
  //
  // Opinion columns (title, country, place, author, description)
  // stay — `photoMapToRow` only writes keys present in the input
  // properties, so unmentioned columns aren't touched.
  //
  // Without a timestamp match, we never merge: two same-named files
  // could be unrelated photos (counter rollover, multi-camera setups),
  // and matching on originalFilename alone would silently merge them.
  // EXIF-less SOOCs and stubs without `taken.instant.timestamp`
  // therefore always import as new rows.
  let id = generated.id;
  let isReimport = false;
  if (exifTimestamp) {
    const candidates = (await db.loadPhotosByOriginalFilename(
      originalFilename
    )) as Array<{ id: string; taken?: { instant?: { timestamp?: string } } }>;
    const matched = candidates.find(
      (c) => c.taken?.instant?.timestamp === exifTimestamp
    );
    if (matched) {
      id = matched.id;
      isReimport = true;
      logger.info(
        `[${originalFilename}] Reusing existing id ${id} (originalFilename + taken match); opinion fields preserved`
      );
    }
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
