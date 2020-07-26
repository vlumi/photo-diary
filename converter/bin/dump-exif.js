#!/usr/bin/env node

const path = require("path");
const util = require("util");

const readExif = require("../extract-properties/read-exif");

process.argv.slice(2).forEach((filePath) => {
  const fileName = path.basename(filePath);
  const rootDir = path.dirname(filePath);
  readExif(fileName, rootDir)
    .then((properties) => console.log(JSON.stringify(properties)))
    .catch((error) => console.error(error));
});
