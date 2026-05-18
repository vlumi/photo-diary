import fs from "node:fs";
import path from "node:path";

import { DIR_INBOX, DIR_ORIGINAL, TARGETS } from "./lib/constants.js";
import * as logger from "./lib/logger.js";
import extractProperties from "./extract-properties/index.js";
import convertImage from "./convert-image/index.js";

export default async (fileName: string, rootDir: string): Promise<void> => {
  const filePath = path.join(rootDir, DIR_INBOX, fileName);
  const stat = await fs.promises.stat(filePath);
  if (stat.size === 0) {
    throw `[${fileName}] Skipping empty file`;
  }

  const hrstart = process.hrtime();
  logger.debug(`[${fileName}] Processing`);

  await Promise.all(
    TARGETS.map((target) => convertImage(fileName, rootDir, target))
  );

  await extractProperties(fileName, rootDir);

  logger.debug(`[${fileName}] Moving file`);
  await fs.promises.rename(
    filePath,
    path.join(rootDir, DIR_ORIGINAL, fileName)
  );

  const hrend = process.hrtime(hrstart);
  const elapsedSeconds =
    Math.round(hrend[0] * 1000 + hrend[1] / 1000000) / 1000;
  logger.info(`[${fileName}] Processed, elapsed ${elapsedSeconds}s`);
};
