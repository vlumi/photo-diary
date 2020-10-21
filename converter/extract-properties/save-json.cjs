const fs = require("fs");
const path = require("path");

const CONST = require("../lib/constants.cjs");
const logger = require("../lib/logger.cjs");

module.exports = (fileName, rootDir, properties) => {
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
