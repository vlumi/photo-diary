import "dotenv/config";
import fs from "node:fs";
import path from "node:path";

import {
  PHOTO_ROOT_DIR,
  DIR_INBOX,
  DIR_ORIGINAL,
  TARGETS,
} from "./constants.js";
import * as logger from "./logger.js";

export const getDirectory = (): string => {
  const directory = PHOTO_ROOT_DIR;
  if (!directory) {
    throw "The PHOTO_ROOT_DIR of the directory structure must be defined.";
  }

  const checkDirectory = (subDir: string): boolean => {
    if (!fs.existsSync(subDir)) {
      logger.error(`Missing directory: ${subDir}`);
      return false;
    }
    if (!fs.lstatSync(subDir).isDirectory()) {
      logger.error(`Not a directory: ${subDir}`);
      return false;
    }
    return true;
  };

  const subDirectories = [
    "",
    DIR_INBOX,
    DIR_ORIGINAL,
    ...TARGETS.map((target) => target.directory),
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
