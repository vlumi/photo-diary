const path = require("path");
const exif = require("exif");
const moment = require("moment");

const logger = require("../utils/logger");
const {
  latitudeToDecimal,
  longitudeToDecimal,
} = require("../utils/coordinate-utils");

module.exports = (fileName, rootDir) => {
  const filePath = path.join(rootDir, fileName);

  const parseExif = (exif) => {
    const cleanString = (string) => {
      return string !== undefined ? string.replace(/\0/g, "").trim() : string;
    };
    const cleanAperture = (apertureValue) =>
      Math.round(10 * Math.sqrt(Math.pow(2, apertureValue))) / 10;
    const cleanShutterSpeed = (shutterSpeedValue) =>
      Math.pow(2, -shutterSpeedValue);
    const parseGps = (gps) => {
      if (!gps) {
        return undefined;
      }
      try {
        const altitude = gps.GPSAltitude ? gps.GPSAltitude : undefined;
        const latitude =
          gps.GPSLatitude && gps.GPSLatitudeRef
            ? latitudeToDecimal(...gps.GPSLatitude, gps.GPSLatitudeRef)
            : undefined;
        const longitude =
          gps.GPSLongitude && gps.GPSLongitudeRef
            ? longitudeToDecimal(...gps.GPSLongitude, gps.GPSLongitudeRef)
            : undefined;
        if (!altitude && !latitude && !longitude) {
          return undefined;
        }
        return {
          altitude,
          latitude,
          longitude,
        };
      } catch (error) {
        logger.error(error);
        return undefined;
      }
    };
    const parseTimestamp = (timestampString) => {
      const timestamp = moment(timestampString, "YYYY:MM:DD HH:mm:ss");
      console.log(timestampString, timestamp);
      return {
        timestamp: timestamp.format("YYYY-MM-DD HH:mm:ss"),
        year: timestamp.year(),
        month: timestamp.month() + 1,
        day: timestamp.date(),
        hour: timestamp.hour(),
        minute: timestamp.minute(),
        second: timestamp.second(),
      };
    };

    return {
      id: fileName,
      title: undefined,
      description: undefined,
      taken: {
        instant: parseTimestamp(
          exif.exif.DateTimeOriginal ||
            exif.exif.CreateDate ||
            exif.image.ModifyDate
        ),
        author: cleanString(exif.image.Artist),
        location: {
          country: undefined,
          place: undefined,
          coordinates: parseGps(exif.gps),
        },
      },
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
      dimensions: {},
    };
  };

  return new Promise((resolve, reject) => {
    new exif.ExifImage({ image: filePath }, function (error, exifData) {
      if (error) {
        reject(error.message);
        return;
      }
      resolve(parseExif(exifData));
    });
  });
};
