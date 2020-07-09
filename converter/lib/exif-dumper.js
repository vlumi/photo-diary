const fs = require("fs");
const path = require("path");
const exif = require("exif");
const imageSize = require("image-size");

const CONST = require("./constants");
const logger = require("./logger");

module.exports = (fileName, rootDir) => {
  const parseExif = (exif) => {
    const cleanString = (string) => {
      return string !== undefined ? string.replace(/\0/g, "").trim() : string;
    };
    const cleanAperture = (apertureValue) =>
      Math.round(10 * Math.sqrt(Math.pow(2, apertureValue))) / 10;
    const cleanShutterSpeed = (shutterSpeedValue) =>
      Math.pow(2, -shutterSpeedValue);

    return {
      artist: cleanString(exif.image.Artist),
      createDateTime:
        exif.exif.DateTimeOriginal ||
        exif.exif.CreateDate ||
        exif.image.ModifyDate,
      camera: {
        make: cleanString(exif.image.Make),
        model: cleanString(exif.image.Model),
        serial: cleanString(exif.exif.SerialNumber),
      },
      lens: {
        make: cleanString(exif.exif.LensMake),
        model: cleanString(exif.exif.LensModel),
        serial: cleanString(exif.exif.LensSerialNumber),
      },
      exposure: {
        focalLength: exif.exif.FocalLength,
        focalLength35mmEquiv: exif.exif.FocalLengthIn35mmFormat,
        aperture: exif.exif.FNumber || cleanAperture(exif.exif.ApertureValue),
        exposureTime:
          exif.exif.ExposureTime ||
          exif.exif.ExposureValue ||
          cleanShutterSpeed(exif.exif.ShutterSpeedValue),
        iso: exif.exif.ISO,
      },
      size: {},
    };
  };
  const addDimensions = (properties, target, filePath) => {
    const dimensions = imageSize(filePath);
    properties.size = properties.size || {};
    if (dimensions.orientation >= 5) {
      // Vertical
      properties.size[target] = {
        width: dimensions.height,
        height: dimensions.width,
      };
    } else {
      // Horizontal
      properties.size[target] = {
        width: dimensions.width,
        height: dimensions.height,
      };
    }
  };

  const inboxFilePath = path.join(rootDir, CONST.DIR_INBOX, fileName);

  return new Promise((resolve, reject) => {
    new exif.ExifImage({ image: inboxFilePath }, function (error, exifData) {
      if (error) {
        reject(error.message);
        return;
      }
      const properties = parseExif(exifData);

      addDimensions(properties, CONST.DIR_ORIGINAL, inboxFilePath);
      CONST.TARGETS.forEach((target) => {
        addDimensions(
          properties,
          target.directory,
          path.join(rootDir, target.directory, fileName)
        );
      });

      const jsonFileName = `${inboxFilePath}.json`;
      fs.writeFile(
        jsonFileName,
        JSON.stringify({ [fileName]: properties }),
        "utf8",
        (error) => {
          if (error) {
            reject(error);
          } else {
            logger.info(`[${fileName}] Dumped exif to ${jsonFileName}`);
            resolve();
          }
        }
      );
    });
  });
};
