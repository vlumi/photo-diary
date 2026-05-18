import path from "node:path";
import exifr from "exifr";

import * as logger from "../lib/logger.js";
import { GeoCoord } from "geo-coord";

type ExifData = Record<string, unknown> & {
  DateTimeOriginal?: Date | string;
  CreateDate?: Date | string;
  ModifyDate?: Date | string;
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

  // EXIF DateTime is "YYYY:MM:DD HH:mm:ss", but exifr parses it into a
  // Date object by default.
  const parseTimestamp = (input: Date | string | undefined) => {
    const invalid = {
      timestamp: "Invalid date",
      year: null,
      month: null,
      day: null,
      hour: null,
      minute: null,
      second: null,
    };
    const date =
      input instanceof Date
        ? input
        : typeof input === "string" &&
            /^\d{4}:\d{2}:\d{2} \d{2}:\d{2}:\d{2}$/.test(input)
          ? new Date(input.replace(":", "-").replace(":", "-"))
          : undefined;
    if (!date || Number.isNaN(date.getTime())) {
      return invalid;
    }
    const pad = (n: number) => String(n).padStart(2, "0");
    const y = date.getFullYear();
    const mo = date.getMonth() + 1;
    const d = date.getDate();
    const h = date.getHours();
    const mi = date.getMinutes();
    const se = date.getSeconds();
    return {
      timestamp: `${y}-${pad(mo)}-${pad(d)} ${pad(h)}:${pad(mi)}:${pad(se)}`,
      year: y,
      month: mo,
      day: d,
      hour: h,
      minute: mi,
      second: se,
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
