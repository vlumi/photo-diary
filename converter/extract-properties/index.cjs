const path = require("path");

const CONST = require("../lib/constants.cjs");
const readExif = require("./read-exif.cjs");
const setDimensions = require("./set-dimensions.cjs");
const saveJson = require("./save-json.cjs");

module.exports = async (fileName, rootDir) => {
  const exif = await readExif(fileName, path.join(rootDir, CONST.DIR_INBOX));
  const properties = await setDimensions(fileName, rootDir, exif);
  await saveJson(fileName, rootDir, properties);
};
