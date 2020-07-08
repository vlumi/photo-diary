const ExifImage = require("exif").ExifImage;

const cleanString = (string) => {
  return string !== undefined ? string.replace(/\0/g, "").trim() : string;
};

const cleanAperture = (apertureValue) =>
  Math.round(10 * Math.sqrt(Math.pow(2, apertureValue))) / 10;
const cleanShutterSpeed = (shutterSpeedValue) =>
  Math.pow(2, -shutterSpeedValue);

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
      exposureTime:
        exif.exif.ExposureTime ||
        exif.exif.ExposureValue ||
        cleanShutterSpeed(exif.exif.ShutterSpeedValue),
      iso: exif.exif.ISO,
    },
    size: {
      width: exif.exif.ExifImageWidth,
      height: exif.exif.ExifImageHeight,
    },
  };
};

try {
  process.argv.slice(2).forEach((filename) => {
    new ExifImage({ image: filename }, function (error, exifData) {
      if (error) console.log("Error: " + error.message);
      else {
        // console.log(exifData);
        console.log(filename, parseExif(exifData));
      }
    });
  });
} catch (error) {
  console.log("Error: " + error.message);
}
