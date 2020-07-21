require("dotenv").config();
const fs = require("fs");
const path = require("path");
const chokidar = require("chokidar");

const CONST = require("./utils/constants");
const config = require("./utils/config");
const logger = require("./utils/logger");
const extractProperties = require("./extract-properties");
const convertImage = require("./convert-image");

try {
  const rootDir = config.getDirectory();
  const watchDir = path.join(rootDir, CONST.DIR_INBOX);
  logger.info(`Watching ${watchDir}`);

  const watcher = chokidar.watch(CONST.WATCH_GLOB, {
    persistent: true,

    ignoreInitial: false,
    followSymlinks: false,
    cwd: watchDir,

    awaitWriteFinish: true,
    atomic: true,
  });

  const processFile = async (fileName) => {
    const filePath = path.join(watchDir, fileName);
    const stat = await fs.promises.stat(filePath);
    if (stat.size === 0) {
      throw `[${fileName}] Skipping empty file`;
    }

    const hrstart = process.hrtime();
    logger.debug(`[${fileName}] Processing`);

    await Promise.all(
      CONST.TARGETS.map((target) => convertImage(fileName, rootDir, target))
    );

    await extractProperties(fileName, rootDir);

    logger.debug(`[${fileName}] Moving file`);
    await fs.promises.rename(
      filePath,
      path.join(rootDir, CONST.DIR_ORIGINAL, fileName)
    );

    const hrend = process.hrtime(hrstart);
    const elapsedSeconds =
      Math.round(hrend[0] * 1000 * 1 + hrend[1] / 1000000) / 1000;
    logger.info(`[${fileName}] Processed, elapsed ${elapsedSeconds}s`);
  };

  const fileQueue = [];
  const fileQueueProcessor = () => {
    const fileName = fileQueue.shift();
    if (fileName) {
      processFile(fileName)
        .then(() => setTimeout(fileQueueProcessor, 0))
        .catch((error) => {
          logger.error("Processing failed for file", fileName, error);
        });
    } else {
      setTimeout(fileQueueProcessor, 1000);
    }
  };
  setTimeout(fileQueueProcessor, 1000);

  watcher
    .on("add", (fileName) => {
      if (!fileQueue.includes(fileName)) {
        fileQueue.push(fileName);
      }
    })
    .on("change", (fileName) => {
      if (!fileQueue.includes(fileName)) {
        fileQueue.push(fileName);
      }
    })
    .on("unlink", (fileName) => logger.debug(`[${fileName}] Removed from inbox`))
    .on("error", (error) => logger.error("Error:", error));
} catch (error) {
  console.error(error);
}
