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

const countryName = (countryCode, lang, countryData) => {
  return countryData.getName(countryCode, lang) || countryCode;
};

const exposure = (lang) => {
  const formatNumber = number(lang);
  return {
    focalLength: (focalLength) => {
      if (isNaN(focalLength)) {
        return focalLength;
      }
      return `ƒ=${formatNumber.default(focalLength)}mm`;
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
        return `${formatNumber.default(exposureTime)}s`;
      }
      const fraction = Math.round(1 / exposureTime);
      return `1⁄${fraction}s`;
    },
    iso: (iso) => {
      if (isNaN(iso)) {
        return iso;
      }
      return `ISO${formatNumber.default(iso)}`;
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
      return `${formatNumber.default(resolution)}MP`;
    },
  };
};
// TODO: remove ->
// TODO: number.default()
const focalLength = (focalLength) => {
  if (isNaN(focalLength)) {
    return focalLength;
  }
  return `ƒ=${focalLength}mm`;
};
// TODO: number.default()
const aperture = (aperture) => {
  if (isNaN(aperture)) {
    return aperture;
  }
  return `ƒ/${aperture}`;
};
// TODO: number.default()
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
// TODO: number.default()
const iso = (iso) => {
  if (isNaN(iso)) {
    return iso;
  }
  return `ISO${iso}`;
};
// TODO: number.default()
const ev = (ev) => {
  if (isNaN(ev)) {
    return ev;
  }
  return Math.round(ev * 2) / 2;
};
// TODO: number.default()
const resolution = (resolution) => {
  if (isNaN(resolution)) {
    return resolution;
  }
  return `${resolution}MP`;
};
// TODO: -> remove
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

  exposure,
  focalLength,
  aperture,
  exposureTime,
  iso,
  ev,
  resolution,
  gear,
  coordinates,
};
