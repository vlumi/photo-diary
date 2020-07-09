const path = require("path");
const exif = require("exif");
const moment = require("moment");

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
      const result = {
        latitude: undefined,
        longitude: undefined,
        altitude: undefined,
      };
      if (!gps) {
        return result;
      }
      const convertCoordinates = (coordinates, ref) =>
        (ref === "W" || ref === "S" ? -1 : 1) *
        (coordinates[0] + coordinates[1] / 60 + coordinates[2] / 3600);
      if (gps.GPSAltitude) {
        result.altitude = gps.GPSAltitude;
      }
      if (gps.GPSLatitude && gps.GPSLatitudeRef) {
        result.latitude = convertCoordinates(
          gps.GPSLatitude,
          gps.GPSLatitudeRef
        );
      }
      if (gps.GPSLongitude && gps.GPSLongitudeRef) {
        result.longitude = convertCoordinates(
          gps.GPSLongitude,
          gps.GPSLongitudeRef
        );
      }
      return result;
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
