import { GeoCoord } from "geo-coord";

import collection from "./collection";
import config from "./config";

const identity = (_) => _;

const number = (lang) => {
  return {
    default: new Intl.NumberFormat(lang).format,
    twoDecimal: new Intl.NumberFormat(lang, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format,
    oneDecimal: new Intl.NumberFormat(lang, {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }).format,
  };
};

const padNumber = (value, length) =>
  value < 0 ? "-" + padLeft(-value, length, "0") : padLeft(value, length, "0");

const share = (value, total) => (value * 100) / total;

const padLeft = (value, length, filler) =>
  String(value).padStart(length, filler);

const padRight = (value, length, filler) =>
  String(value).padEnd(length, filler);

const date = ({ year, month, day, separator = "-" }) => {
  const parts = [];
  if (year) {
    parts.push(padNumber(year, 4));
    if (month) {
      parts.push(padNumber(month, 2));
      if (day) {
        parts.push(padNumber(day, 2));
      }
    }
  }
  return parts.join(separator);
};
const time = ({ hour, minute, second, separator = ":" }) => {
  const parts = [];
  if (hour) {
    parts.push(padNumber(hour, 2));
    if (minute) {
      parts.push(padNumber(minute, 2));
      if (second) {
        parts.push(padNumber(second, 2));
      }
    }
  }
  return parts.join(separator);
};

const DOW = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
const dayOfWeek = (dow) => {
  return DOW[dow % 7];
};

const countryName = (lang, countryData) => (countryCode) =>
  countryData.getName(countryCode, lang) || countryCode;

const exposure = (lang) => {
  const formatNumber = number(lang);
  return {
    focalLength: (focalLength) => {
      if (isNaN(focalLength)) {
        return focalLength;
      }
      return formatNumber.default(focalLength);
    },
    aperture: (aperture) => {
      if (isNaN(aperture)) {
        return aperture;
      }
      return `ƒ/${formatNumber.default(aperture)}`;
    },
    exposureTime: (exposureTime) => {
      if (isNaN(exposureTime)) {
        return exposureTime;
      }
      if (exposureTime >= 1) {
        return formatNumber.default(exposureTime);
      }
      const fraction = Math.round(1 / exposureTime);
      return `1⁄${fraction}`;
    },
    iso: (iso) => {
      if (isNaN(iso)) {
        return iso;
      }
      return String(iso);
    },
    ev: (ev) => {
      if (isNaN(ev)) {
        return ev;
      }
      return formatNumber.default(Math.round(ev * 2) / 2);
    },
    resolution: (resolution) => {
      if (isNaN(resolution)) {
        return resolution;
      }
      return formatNumber.default(resolution);
    },
  };
};
const gear = (make, model) => {
  if (!make && !model) return undefined;
  if (!make) return model;
  if (!model) return make;
  if (model.startsWith(make)) {
    return model;
  }
  return [make, model].join(" ");
};
const coordinates = (latitude, longitude) => {
  return new GeoCoord(latitude, longitude).toString();
};
const categoryValue = (lang, t, countryData) => {
  const formatExposure = exposure(lang);
  return (category) => {
    switch (category) {
      case "author":
        return identity;
      case "country":
        return countryName(lang, countryData);
      case "year-month":
        return (yearMonth) => {
          const [year, month] = yearMonth.split("-");
          return t("stats-year-month", {
            year,
            month: t(`month-long-${month}`),
          });
        };
      case "year":
        return identity;
      case "month":
        return (month) => t(`month-long-${month}`);
      case "weekday":
        return (dow) => t(`weekday-long-${dayOfWeek(dow)}`);
      case "hour":
        return (hour) => `${padNumber(hour, 2)}:00–`;
      case "camera-make":
        return identity;
      case "camera":
        return identity;
      case "lens":
        return identity;
      case "camera-lens":
        return (cameraLens) => JSON.parse(cameraLens).join(" + ");
      case "focal-length":
        return formatExposure.focalLength;
      case "aperture":
        return formatExposure.aperture;
      case "exposure-time":
        return formatExposure.exposureTime;
      case "iso":
        return formatExposure.iso;
      case "ev":
        return formatExposure.ev;
      case "lv":
        return formatExposure.ev;
      case "resolution":
        return formatExposure.resolution;
      default:
        return identity;
    }
  };
};
const categorySorter = (keyField, valueField) => (category) => {
  switch (category) {
    case "author":
    case "country":
      return collection.strSortByFieldAsc(valueField);
    case "year-month":
      return (a, b) => {
        const [yearA, monthA] = a[keyField].split("-");
        const [yearB, monthB] = b[keyField].split("-");
        const yearComparison = collection.numSortByFieldAsc(keyField)(
          yearA,
          yearB
        );
        if (!yearComparison) {
          return yearComparison;
        }
        return collection.numSortByFieldAsc(keyField)(monthA, monthB);
      };
    case "year":
    case "month":
      return collection.numSortByFieldAsc(keyField);
    case "weekday":
      return (a, b) => {
        const dowA =
          a[keyField] < config.FIRST_WEEKDAY ? Number(a[keyField]) + 7 : a[keyField];
        const dowB =
          b[keyField] < config.FIRST_WEEKDAY ? Number(b[keyField]) + 7 : b[keyField];
        return collection.compareWithNaN(dowA, dowB, () => dowA - dowB);
      };
    case "hour":
      return collection.numSortByFieldAsc(keyField);
    case "camera-make":
    case "camera":
    case "lens":
    case "camera-lens":
      return collection.strSortByFieldAsc(keyField);
    case "focal-length":
    case "aperture":
    case "exposure-time":
    case "iso":
    case "ev":
    case "lv":
    case "resolution":
      return collection.numSortByFieldAsc(keyField);
    default:
      return identity;
  }
};

export default {
  identity,
  number,
  padNumber,
  share,

  padLeft,
  padRight,

  date,
  time,
  dayOfWeek,

  countryName,

  exposure,
  gear,
  coordinates,

  categoryValue,
  categorySorter,
};
