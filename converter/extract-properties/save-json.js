const fs = require("fs");
const path = require("path");

const CONST = require("../utils/constants");
const logger = require("../utils/logger");

module.exports = (fileName, rootDir, properties) => {
  const inboxFilePath = path.join(rootDir, CONST.DIR_INBOX, fileName);
  return new Promise((resolve, reject) => {
    const jsonFileName = `${inboxFilePath}.json`;
    fs.writeFile(
      jsonFileName,
      JSON.stringify({ [fileName]: properties }),
      "utf8",
      (error) => {
        if (error) {
          reject(error);
        } else {
          logger.info(`[${fileName}] Dumped exif to ${jsonFileName}`);
          resolve();
        }
      }
    );
  });
};
