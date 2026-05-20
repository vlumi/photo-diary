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

  const checkDirectory = (subDir: string): boolean => {
    if (!fs.existsSync(subDir)) {
      logger.error(`Missing directory: ${subDir}`);
      return false;
    }
    // statSync follows symlinks — lstat would report the symlink itself,
    // which doesn't have isDirectory() true even when it points at a dir.
    if (!fs.statSync(subDir).isDirectory()) {
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
    throw `Invalid photo-repository directory structure at ${directory}.`;
  }
  return directory;
};
