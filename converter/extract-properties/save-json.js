import fs from "fs";
import path from "path";

import CONST from "../lib/constants.js";
import logger from "../lib/logger.js";

export default (fileName, rootDir, properties) => {
  return new Promise((resolve, reject) => {
    const inboxFilePath = path.join(rootDir, CONST.DIR_INBOX, fileName);
    const jsonFileName = `${inboxFilePath}.json`;

    fs.writeFile(
      jsonFileName,
      JSON.stringify({ [fileName]: properties }),
      "utf8",
      (error) => {
        if (error) {
          reject(error);
        } else {
          logger.debug(`[${fileName}] Dumped exif to ${jsonFileName}`);
          resolve();
        }
      }
    );
  });
};
