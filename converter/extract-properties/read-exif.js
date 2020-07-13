const path = require("path");
const exifr = require("exifr");
const moment = require("moment");

const logger = require("../utils/logger");
const { GeoCoord } = require("geo-coord");

module.exports = async (fileName, rootDir) => {
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
      if (
        !gps ||
        !gps.GPSLatitude ||
        !gps.GPSLatitudeRef ||
        !gps.GPSLongitude ||
        !gps.GPSLongitudeRef
      ) {
        return undefined;
      }
      try {
        const altitude = gps.GPSAltitude ? gps.GPSAltitude : undefined;
        const geoCoord = new GeoCoord(
          ...gps.GPSLatitude,
          gps.GPSLatitudeRef,
          ...gps.GPSLongitude,
          gps.GPSLongitudeRef
        );
        const result = {
          coordinates: {
            altitude,
            ...geoCoord.toDD(),
          },
        };
        return result;
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
          exif.DateTimeOriginal || exif.CreateDate || exif.ModifyDate
        ),
        author: cleanString(exif.Artist),
        location: {
          country: undefined,
          place: undefined,
          ...parseGps(exif),
        },
      },
      camera: {
        make: cleanString(exif.Make),
        model: cleanString(exif.Model),
        serial: cleanString(exif.SerialNumber),
      },
      lens: {
        make: cleanString(exif.LensMake),
        model: cleanString(exif.LensModel),
        serial: cleanString(exif.LensSerialNumber),
      },
      exposure: {
        focalLength: exif.FocalLength,
        focalLength35mmEquiv: exif.FocalLengthIn35mmFormat,
        aperture: exif.FNumber || cleanAperture(exif.ApertureValue),
        exposureTime:
          exif.ExposureTime ||
          exif.ExposureValue ||
          cleanShutterSpeed(exif.ShutterSpeedValue),
        iso: exif.ISO,
      },
      dimensions: {},
    };
  };

  const exifData = await exifr.parse(filePath);
  return parseExif(exifData);
};
