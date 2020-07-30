import { GeoCoord } from "geo-coord";

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

const padNumber = (value, length) => padLeft(value, length, "0");

const share = (value, total) => (value * 100) / total;

const padLeft = (value, length, filler) =>
  String(value).padStart(length, filler);

const padRight = (value, length, filler) =>
  String(value).padEnd(length, filler);

const date = ({ year, month, day, separator = "-" }) => {
  const parts = [];
  if (year) {
    parts.push(padLeft(year, 4));
    if (month) {
      parts.push(padLeft(month, 2));
      if (day) {
        parts.push(padLeft(day, 2));
      }
    }
  }
  return parts.join(separator);
};
const time = ({ hour, minute, second, separator = ":" }) => {
  const parts = [];
  if (hour) {
    parts.push(padLeft(hour, 2));
    if (minute) {
      parts.push(padLeft(minute, 2));
      if (second) {
        parts.push(padLeft(second, 2));
      }
    }
  }
  return parts.join(separator);
};

const DOW = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
const dayOfWeek = (dow) => {
  return DOW[dow % 7];
};

const countryName = (countryCode, lang, countryData) => {
  return countryData.getName(countryCode, lang) || countryCode;
};

const focalLength = (focalLength) => {
  if (isNaN(focalLength)) {
    return focalLength;
  }
  return `ƒ=${focalLength}mm`;
};
const aperture = (aperture) => {
  if (isNaN(aperture)) {
    return aperture;
  }
  return `ƒ/${aperture}`;
};
const exposureTime = (exposureTime) => {
  if (isNaN(exposureTime)) {
    return exposureTime;
  }
  if (exposureTime >= 1) {
    return `${exposureTime}s`;
  }
  const fraction = Math.round(1 / exposureTime);
  return `1/${fraction}s`;
};
const iso = (iso) => {
  if (isNaN(iso)) {
    return iso;
  }
  return `ISO${iso}`;
};
const resolution = (resolution) => {
  if (isNaN(resolution)) {
    return resolution;
  }
  return `${resolution}MP`;
};
const gear = (make, model) => {
  if (!make && !model) return "";
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

  focalLength,
  aperture,
  exposureTime,
  iso,
  resolution,
  gear,
  coordinates,
};
