const fs = require("fs");
const path = require("path");
const exif = require("exif");
const imageSize = require("image-size");

const logger = require("./logger");

const cleanString = (string) => {
  return string !== undefined ? string.replace(/\0/g, "").trim() : string;
};

const cleanAperture = (apertureValue) =>
  Math.round(10 * Math.sqrt(Math.pow(2, apertureValue))) / 10;
// const cleanShutterSpeed = (shutterSpeedValue) => Math.log2(shutterSpeedValue);
const cleanShutterSpeed = (shutterSpeedValue) => {
  const s = Math.pow(2, -shutterSpeedValue);
  return s < 1 ? `1/${Math.round(1 / s)}` : `${s}`;
};

const parseExif = (exif) => {
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
      shutterSpeed: cleanShutterSpeed(exif.exif.ShutterSpeedValue),
      iso: exif.exif.ISO,
    },
    size: {
      width:
        exif.exif.ExifImageWidth > 0 ? exif.exif.ExifImageWidth : undefined,
      height:
        exif.exif.ExifImageHeight > 0 ? exif.exif.ExifImageHeight : undefined,
    },
  };
};

module.exports = (fileName) => {
  return new Promise((resolve, reject) => {
    const baseName = fileName.split(".").slice(0, -1).join(".");
    new exif.ExifImage({ image: fileName }, function (error, exifData) {
      if (error) {
        reject(error.message);
        return;
      }
      //   console.log(exifData);
      const properties = parseExif(exifData);
      if (!properties.size.width || !properties.size.height) {
        // Image size is not always included in the EXIF
        const dimensions = imageSize(fileName);
        properties.size.width = dimensions.width;
        properties.size.height = dimensions.height;
      }

      fs.writeFile(
        `${baseName}.json`,
        JSON.stringify({ [fileName]: properties }),
        "utf8",
        (error) => {
          if (error) {
            reject(error);
          } else {
            logger.info(`[${fileName}] Extracted exif`);
            resolve();
          }
        }
      );
    });
  });
};
