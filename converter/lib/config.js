require("dotenv").config();
const fs = require("fs");
const path = require("path");

const CONST = require("./constants");
const logger = require("../lib/logger");

const getDirectory = () => {
  const directory = CONST.PHOTO_ROOT_DIR;
  if (!directory) {
    throw "The PHOTO_ROOT_DIR of the directory structure must be defined.";
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
    throw `Invalid directory structure in PHOTO_ROOT_DIR (${directory}).`;
  }
  return directory;
};

module.exports = {
  getDirectory,
};
