#!/usr/bin/env node

import path from "path";

import readExif from "../extract-properties/read-exif.cjs";

process.argv.slice(2).forEach((filePath) => {
  const fileName = path.basename(filePath);
  const rootDir = path.dirname(filePath);
  readExif(fileName, rootDir)
    .then((properties) => console.log(JSON.stringify(properties)))
    .catch((error) => console.error(error));
});
