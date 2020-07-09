const path = require("path");

const readExif = require("./extract-properties/read-exif");

process.argv.slice(2).forEach((filePath) => {
  const fileName = path.basename(filePath);
  const rootDir = path.dirname(filePath);
  readExif(fileName, rootDir)
    .then((properties) => {
      console.log(fileName, properties);
    })
    .catch((error) => console.error(error));
});
