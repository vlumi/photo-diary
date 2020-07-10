require("dotenv").config();
const fs = require("fs");
const path = require("path");

const CONST = require("./constants");
const logger = require("../utils/logger");

const DEBUG = process.env.DEBUG || CONST.DEBUG;

const getDirectory = () => {
  const directory = process.env[CONST.ENV_ROOT];
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

module.exports = {
  DEBUG,

  getDirectory,
};
