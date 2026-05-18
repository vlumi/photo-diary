import "dotenv/config";
import path from "node:path";
import chokidar from "chokidar";

import { DIR_INBOX } from "./lib/constants.js";
import { getDirectory } from "./lib/config.js";
import * as logger from "./lib/logger.js";
import processFile from "./process-file.js";

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

  const fileQueue: string[] = [];
  const fileQueueProcessor = (): void => {
    const fileName = fileQueue.shift();
    if (fileName) {
      processFile(fileName, rootDir)
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
