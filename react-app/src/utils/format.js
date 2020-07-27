import { GeoCoord } from "geo-coord";

const padNumber = (value, length) => String(value).padStart(length, "0");
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

const focalLength = (focalLength) => `ƒ=${focalLength}mm`;
const aperture = (aperture) => `ƒ/${aperture}`;
const exposureTime = (exposureTime) => {
  if (exposureTime >= 1) {
    return `${exposureTime}s`;
  }
  const fraction = Math.round(1 / exposureTime);
  return `1/${fraction}s`;
};
const iso = (iso) => `ISO${iso}`;
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
  date,
  time,

  focalLength,
  aperture,
  exposureTime,
  iso,
  megapixels,
  gear,
  coordinates,
};
