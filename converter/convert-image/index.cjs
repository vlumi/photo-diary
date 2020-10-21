const gm = require("gm").subClass({ imageMagick: true });
const path = require("path");
const fs = require("fs");

const CONST = require("../lib/constants.cjs");
const logger = require("../lib/logger.cjs");

module.exports = (fileName, root, target) => {
  return new Promise((resolve, reject) => {
    const inputPath = path.join(root, CONST.DIR_INBOX, fileName);
    const outputPath = path.join(root, target.directory, fileName);

    const width = target.dimensions.width;
    const height = target.dimensions.height;
    logger.debug(`[${fileName}] Resizing to ${width}x${height}`);

    gm(inputPath)
      .autoOrient()
      .resize(width, height)
      .write(outputPath, async (error) => {
        if (error) {
          reject(error);
        } else {
          await fs.promises.chmod(outputPath, "0644");
          resolve();
        }
      });
  });
};
