import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import chokidar from "chokidar";

import { DIR_INBOX, DIR_ORIGINAL, TARGETS } from "./lib/constants.js";
import { getDirectory } from "./lib/config.js";
import * as logger from "./lib/logger.js";
import extractProperties from "./extract-properties/index.js";
import convertImage from "./convert-image/index.js";

try {
  const rootDir = getDirectory();
  const watchDir = path.join(rootDir, DIR_INBOX);
  logger.info(`Watching ${watchDir}`);

  // chokidar v4 dropped glob-pattern support for the path arg; use a filter.
  const isJpeg = (filePath: string) => /\.jpe?g$/i.test(filePath);
  const watcher = chokidar.watch(watchDir, {
    persistent: true,
    ignoreInitial: false,
    followSymlinks: false,
    awaitWriteFinish: true,
    atomic: true,
    ignored: (filePath, stats) =>
      stats !== undefined && stats.isFile() && !isJpeg(filePath),
  });

  const processFile = async (fileName: string): Promise<void> => {
    const filePath = path.join(watchDir, fileName);
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

  const fileQueue: string[] = [];
  const fileQueueProcessor = (): void => {
    const fileName = fileQueue.shift();
    if (fileName) {
      processFile(fileName)
        .then(() => setTimeout(fileQueueProcessor, 0))
        .catch((err) => {
          logger.error("Processing failed for file", fileName, err);
        });
    } else {
      setTimeout(fileQueueProcessor, 1000);
    }
  };
  setTimeout(fileQueueProcessor, 1000);

  const enqueueIfNew = (absPath: string) => {
    const fileName = path.basename(absPath);
    if (!fileQueue.includes(fileName)) {
      fileQueue.push(fileName);
    }
  };

  watcher
    .on("add", enqueueIfNew)
    .on("change", enqueueIfNew)
    .on("unlink", (absPath) =>
      logger.debug(`[${path.basename(absPath)}] Removed from inbox`)
    )
    .on("error", (err) => logger.error("Error:", err));
} catch (err) {
  console.error(err);
}
