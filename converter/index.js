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

  const processFile = (fileName) => {
    const filePath = path.join(watchDir, fileName);
    const hrstart = process.hrtime();

    const moveFile = () => {
      logger.info(`[${fileName}] Moving file`);
      return fs.promises.rename(
        filePath,
        path.join(rootDir, CONST.DIR_ORIGINAL, fileName)
      );
    };

    Promise.resolve()
      .then(() => logger.info(`[${fileName}] Processing`))
      .then(() => fs.promises.stat(filePath))
      .then(
        (stat) =>
          new Promise((resolve, reject) => {
            if (stat.size > 0) {
              resolve();
            } else {
              reject(`[${fileName}] Skipping empty file`);
            }
          })
      )
      .then(() =>
        CONST.TARGETS.reduce(
          (promise, target) =>
            promise.then(() => convertImage(fileName, rootDir, target)),
          Promise.resolve()
        )
      )
      .then(() => extractProperties(fileName, rootDir))
      .then(() => moveFile())
      .then(() => {
        const hrend = process.hrtime(hrstart);
        const elapsedSeconds =
          Math.round(hrend[0] * 1000 * 1 + hrend[1] / 1000000) / 1000;
        logger.info(`[${fileName}] Processed, elapsed ${elapsedSeconds}s`);
      })
      .catch((error) => logger.error(error));
  };

  watcher
    .on("add", (fileName) => processFile(fileName))
    .on("change", (fileName) => processFile(fileName))
    .on("unlink", (fileName) => logger.info(`[${fileName}] Removed from inbox`))
    .on("error", (error) => logger.error("Error:", error));
} catch (error) {
  console.error(error);
}
