#!/usr/bin/env -S npx tsx
import path from "node:path";

import readExif from "../extract-properties/read-exif.js";

process.argv.slice(2).forEach((filePath) => {
  const fileName = path.basename(filePath);
  const rootDir = path.dirname(filePath);
  readExif(fileName, rootDir)
    .then((properties) => {
      // Include originalFilename so the output is ready to feed
      // through the converter's JSON sidecar pipeline without the
      // operator's script having to add it. `id` and
      // `originalFilename` are the same value here (the SOOC's
      // basename); after the converter imports the photo they diverge
      // — `id` becomes the <ts>-<uuid> stable id while
      // `originalFilename` stays as this name.
      properties.originalFilename = fileName;
      console.log(JSON.stringify(properties));
    })
    .catch((err) => console.error(err));
});
