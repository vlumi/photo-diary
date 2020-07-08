require("dotenv").config();
const fs = require("fs");
const path = require("path");
const chokidar = require("chokidar");

const CONST = require("./constants");
const logger = require("./logger");
const exifDumper = require("./exif-dumper");
const imageConverter = require("./image-converter");

const TARGETS = [
  {
    directory: CONST.DIR_SIZE_DISPLAY,
    dimensions: CONST.DIM_DISPLAY,
  },
  {
    directory: CONST.DIR_SIZE_THUMBNAIL,
    dimensions: CONST.DIM_THUMBNAIL,
  },
];

const getDirectory = (env) => {
  const directory = process.env[env];
  if (!directory) {
    throw `The ROOT of the directory structure must be defined.`;
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
    CONST.DIR_SIZE_ORIGINAL,
    ...TARGETS.map((target) => target.directory),
  ];
  const missing =
    subDirectories.filter(
      (subDirectory) => !checkDirectory(path.join(directory, subDirectory))
    ).length > 0;
  if (missing) {
    throw `Invalid directory structure in ROOT.`;
  }
  return directory;
};

try {
  const rootDir = getDirectory("ROOT");
  const watchDir = path.join(rootDir, "inbox");
  logger.info(`Watching ${watchDir}`);

  const watcher = chokidar.watch("*.jpg", {
    persistent: true,

    ignoreInitial: false,
    followSymlinks: false,
    cwd: watchDir,

    awaitWriteFinish: true,
    atomic: true,
  });

  const processFile = (fileName) => {
    const filePath = path.join(watchDir, fileName);
    const hrend = process.hrtime();

    const moveFile = () => {
      logger.info(`[${fileName}] Moving file`);
      return fs.promises.rename(filePath, path.join(rootDir, CONST.DIR_SIZE_ORIGINAL, fileName));
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
      .then(() => exifDumper(filePath))
      .then(() =>
        TARGETS.reduce(
          (promise, target) =>
            promise.then(() => imageConverter(fileName, rootDir, target)),
          Promise.resolve()
        )
      )
      .then(() => moveFile())
      .then(() => process.hrtime(hrend))
      .then((hrend) => {
        const elapsedSeconds =
          Math.round(hrend[0] * 1000 * 1 + hrend[1] / 1000000) / 1000;
        logger.info(`[${fileName}] Processed, elapsed ${elapsedSeconds}s`);
      })
      .catch((error) => console.error(error));
  };

  watcher
    .on("add", (fileName) => processFile(fileName))
    .on("change", (fileName) => processFile(fileName))
    .on("unlink", (fileName) => console.log("Removed:", fileName))
    .on("error", (error) => console.error("Error:", error));
} catch (error) {
  console.error(error);
}
