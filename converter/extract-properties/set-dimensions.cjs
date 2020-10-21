const path = require("path");
const imageSize = require("image-size");

const CONST = require("../lib/constants.cjs");

module.exports = (fileName, rootDir, properties) => {
  const inboxFilePath = path.join(rootDir, CONST.DIR_INBOX, fileName);
  const addFileDimensions = (properties, target, filePath) => {
    const dimensions = imageSize(filePath);
    properties.dimensions = properties.dimensions || {};
    if (dimensions.orientation >= 5) {
      // Vertical
      properties.dimensions[target] = {
        width: dimensions.height,
        height: dimensions.width,
      };
    } else {
      // Horizontal
      properties.dimensions[target] = {
        width: dimensions.width,
        height: dimensions.height,
      };
    }
  };
  return new Promise((resolve) => {
    addFileDimensions(properties, CONST.DIR_ORIGINAL, inboxFilePath);
    CONST.TARGETS.forEach((target) => {
      addFileDimensions(
        properties,
        target.directory,
        path.join(rootDir, target.directory, fileName)
      );
    });
    resolve(properties);
  });
};
