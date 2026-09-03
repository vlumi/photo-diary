import sharp from "sharp";
import exifReader from "exif-reader";

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
  sourcePath: string,
  id: string
): Promise<Record<string, unknown>> => {
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

  // EXIF DateTimeOriginal carries wall-clock time with no timezone
  // ("2024:01:15 10:30:45"). exif-reader returns it as a Date built
  // via Date.UTC, so the wall-clock digits are recoverable via
  // getUTC*() regardless of the runner's local TZ. The string branch
  // catches the rare non-Date payload and parses it into the same
  // shape.
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
          ? (() => {
            const [datePart, timePart] = input.split(" ");
            const [y, mo, d] = datePart.split(":").map(Number);
            const [h, mi, se] = timePart.split(":").map(Number);
            return new Date(Date.UTC(y, mo - 1, d, h, mi, se));
          })()
          : undefined;
    if (!date || Number.isNaN(date.getTime())) {
      return invalid;
    }
    const pad = (n: number) => String(n).padStart(2, "0");
    const y = date.getUTCFullYear();
    const mo = date.getUTCMonth() + 1;
    const d = date.getUTCDate();
    const h = date.getUTCHours();
    const mi = date.getUTCMinutes();
    const se = date.getUTCSeconds();
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
    id,
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

  // sharp reads the EXIF segment as a Buffer alongside the dimensions
  // pipeline that runs later; exif-reader parses that buffer into
  // pre-typed native values (Date, number, string), grouped by EXIF
  // IFD (Image / Photo / GPSInfo). Flatten the groups into a single
  // record, and alias the three tags whose EXIF-spec name differs
  // from what the downstream normalizer above expects:
  //
  //   Photo.ISOSpeedRatings          → ISO
  //   Photo.BodySerialNumber         → SerialNumber (camera body)
  //   Photo.FocalLengthIn35mmFilm    → FocalLengthIn35mmFormat
  const meta = await sharp(sourcePath).metadata();
  const parsed: ReturnType<typeof exifReader> | undefined = meta.exif
    ? exifReader(meta.exif)
    : undefined;
  const flat = {
    ...parsed?.Image,
    ...parsed?.Photo,
    ...parsed?.GPSInfo,
  } as Record<string, unknown>;
  const exifData: ExifData = {
    ...flat,
    ISO: flat.ISO ?? flat.ISOSpeedRatings,
    SerialNumber: flat.SerialNumber ?? flat.BodySerialNumber,
    FocalLengthIn35mmFormat:
      flat.FocalLengthIn35mmFormat ?? flat.FocalLengthIn35mmFilm,
  } as ExifData;
  return parseExif(exifData);
};
