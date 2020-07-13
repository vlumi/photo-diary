const gm = require("gm").subClass({ imageMagick: true });
const path = require("path");

const CONST = require("../utils/constants");
const logger = require("../utils/logger");

module.exports = (fileName, root, target) => {
  return new Promise((resolve, reject) => {
    const inputPath = path.join(root, CONST.DIR_INBOX, fileName);
    const outputPath = path.join(root, target.directory, fileName);

    const width = target.dimensions.width;
    const height = target.dimensions.height;
    logger.info(`[${fileName}] Resizing to ${width}x${height}`);

    gm(inputPath)
      .autoOrient()
      .resize(width, height)
      .write(outputPath, (error) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
  });
};
