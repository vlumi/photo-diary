const path = require("path");

const CONST = require("../lib/constants");
const readExif = require("./read-exif");
const setDimensions = require("./set-dimensions");
const saveJson = require("./save-json");

module.exports = async (fileName, rootDir) => {
  const exif = await readExif(fileName, path.join(rootDir, CONST.DIR_INBOX));
  const properties = await setDimensions(fileName, rootDir, exif);
  await saveJson(fileName, rootDir, properties);
};
