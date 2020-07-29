import { GeoCoord } from "geo-coord";

const identity = (_) => _;

const padNumber = (value, length) => String(value).padStart(length, "0");

const share = (value, total) => Math.floor((value / total) * 1000) / 10;

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
const megapixels = (width, height) => {
  const mpix = Math.round((width * height) / 10 ** 6);
  return mpix ? `${mpix}MP` : "";
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
  padNumber,
  share,

  date,
  time,
  dayOfWeek,

  countryName,

  focalLength,
  aperture,
  exposureTime,
  iso,
  megapixels,
  gear,
  coordinates,
};
