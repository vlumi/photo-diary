import path from "node:path";
import exifr from "exifr";
import moment from "moment";

import * as logger from "../lib/logger.js";
import { GeoCoord } from "geo-coord";

type ExifData = Record<string, unknown> & {
  DateTimeOriginal?: string;
  CreateDate?: string;
  ModifyDate?: string;
  Artist?: string;
  Make?: string;
  Model?: string;
  SerialNumber?: string;
  LensMake?: string;
  LensModel?: string;
  LensSerialNumber?: string;
  FocalLength?: number;
  FocalLengthIn35mmFormat?: number;
  FNumber?: number;
  ApertureValue?: number;
  ExposureTime?: number;
  ExposureValue?: number;
  ShutterSpeedValue?: number;
  ISO?: number;
  GPSLatitude?: number[];
  GPSLatitudeRef?: string;
  GPSLongitude?: number[];
  GPSLongitudeRef?: string;
  GPSAltitude?: number;
};

export default async (
  fileName: string,
  rootDir: string
): Promise<Record<string, unknown>> => {
  const filePath = path.join(rootDir, fileName);

  const cleanString = (s: string | undefined): string | undefined =>
    s !== undefined ? s.replace(/\0/g, "").trim() : s;

  const cleanAperture = (apertureValue: number): number =>
    Math.round(10 * Math.sqrt(Math.pow(2, apertureValue))) / 10;

  const cleanShutterSpeed = (shutterSpeedValue: number): number =>
    Math.pow(2, -shutterSpeedValue);

  const parseGps = (gps: ExifData) => {
    if (
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
      return {
        coordinates: {
          altitude,
          ...geoCoord.toDD(),
        },
      };
    } catch (err) {
      logger.error(err);
      return undefined;
    }
  };

  const parseTimestamp = (timestampString: string | undefined) => {
    const timestamp = moment(timestampString, "YYYY:MM:DD HH:mm:ss");
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

  const parseExif = (exif: ExifData) => ({
    id: fileName,
    taken: {
      instant: parseTimestamp(
        exif.DateTimeOriginal || exif.CreateDate || exif.ModifyDate
      ),
      author: cleanString(exif.Artist),
      location: {
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
      aperture:
        exif.FNumber ??
        (exif.ApertureValue !== undefined
          ? cleanAperture(exif.ApertureValue)
          : undefined),
      exposureTime:
        exif.ExposureTime ??
        exif.ExposureValue ??
        (exif.ShutterSpeedValue !== undefined
          ? cleanShutterSpeed(exif.ShutterSpeedValue)
          : undefined),
      iso: exif.ISO,
    },
    dimensions: {},
  });

  const exifData = ((await exifr.parse(filePath)) ?? {}) as ExifData;
  return parseExif(exifData);
};
