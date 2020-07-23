const path = require("path");
const util = require("util");

const readExif = require("../extract-properties/read-exif");

process.argv.slice(2).forEach((filePath) => {
  const fileName = path.basename(filePath);
  const rootDir = path.dirname(filePath);
  readExif(fileName, rootDir)
    .then((properties) => {
      console.log(
        fileName,
        util.inspect(properties, {
          showHidden: true,
          depth: null,
          colors: true,
        })
      );
    })
    .catch((error) => console.error(error));
});
