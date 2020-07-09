const path = require("path");

const CONST = require("../util/constants");
const readExif = require("./read-exif");
const setDimensions = require("./set-dimensions");
const saveJson = require("./save-json");

module.exports = (fileName, rootDir) => {
  return Promise.resolve()
    .then(() => readExif(fileName, path.join(rootDir, CONST.DIR_INBOX)))
    .then((exif) => setDimensions(fileName, rootDir, exif))
    .then((properties) => saveJson(fileName, rootDir, properties));
};
