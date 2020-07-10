const gm = require("gm").subClass({ imageMagick: true });
const path = require("path");

const CONST = require("../utils/constants");
const logger = require("../utils/logger");

module.exports = (fileName, root, target) => {
  const inputDir = path.join(root, CONST.DIR_INBOX);
  const outputDir = path.join(root, target.directory);
  const dimensions = target.dimensions;
  return new Promise((resolve, reject) => {
    const width = dimensions.width;
    const height = dimensions.height;
    logger.info(`[${fileName}] Resizing to ${width}x${height}`);
    gm(path.join(inputDir, fileName))
      .autoOrient()
      .resize(width, height)
      .write(path.join(outputDir, fileName), (error) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
  });
};
