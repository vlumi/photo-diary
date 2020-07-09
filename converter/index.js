require("dotenv").config();
const fs = require("fs");
const path = require("path");
const chokidar = require("chokidar");

const CONST = require("./util/constants");
const logger = require("./util/logger");
const extractProperties = require("./extract-properties");
const convertImage = require("./convert-image");

const getDirectory = (env) => {
  const directory = process.env[env];
  if (!directory) {
    throw "The ROOT of the directory structure must be defined.";
  }

  const checkDirectory = (directory) => {
    if (!fs.existsSync(directory)) {
      logger.error(`Missing directory: ${directory}`);
      return false;
    }
    if (!fs.lstatSync(directory).isDirectory()) {
      logger.error(`Not a directory: ${directory}`);
      return false;
    }
    return true;
  };

  const subDirectories = [
    "",
    CONST.DIR_INBOX,
    CONST.DIR_ORIGINAL,
    ...CONST.TARGETS.map((target) => target.directory),
  ];
  const missing =
    subDirectories.filter(
      (subDirectory) => !checkDirectory(path.join(directory, subDirectory))
    ).length > 0;
  if (missing) {
    throw "Invalid directory structure in ROOT.";
  }
  return directory;
};

try {
  const rootDir = getDirectory(CONST.ENV_ROOT);
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
