import { GeoCoord } from "geo-coord";
import type { TFunction } from "i18next";

import collection from "./collection";
import config from "./config";

interface CountryData {
  getName(code: string, lang: string): string | undefined;
}

const identity = <T,>(_: T): T => _;

const number = (lang: string) => {
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

const padNumber = (value: number | string, length: number): string => {
  const n = Number(value);
  return n < 0 ? "-" + padLeft(-n, length, "0") : padLeft(value, length, "0");
};

const share = (value: number, total: number): number => (value * 100) / total;

const padLeft = (
  value: number | string,
  length: number,
  filler: string
): string => String(value).padStart(length, filler);

const padRight = (
  value: number | string,
  length: number,
  filler: string
): string => String(value).padEnd(length, filler);

interface DateParts {
  year?: number;
  month?: number;
  day?: number;
  separator?: string;
}
const date = ({ year, month, day, separator = "-" }: DateParts): string => {
  const parts: string[] = [];
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

interface TimeParts {
  hour?: number;
  minute?: number;
  second?: number;
  separator?: string;
}
const time = ({
  hour,
  minute,
  second,
  separator = ":",
}: TimeParts): string => {
  const parts: string[] = [];
  if (hour !== undefined && !isNaN(hour)) {
    parts.push(padNumber(hour, 2));
    if (minute !== undefined && !isNaN(minute)) {
      parts.push(padNumber(minute, 2));
      if (second !== undefined && !isNaN(second)) {
        parts.push(padNumber(second, 2));
      }
    }
  }
  return parts.join(separator);
};

const DOW = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
const dayOfWeek = (dow: number): string => {
  return DOW[dow % 7];
};

const countryName =
  (lang: string, countryData: CountryData) =>
  (countryCode: string): string =>
    countryData.getName(countryCode, lang) || countryCode;

// ISO 3166-2 subdivision code → localized name. Codes arrive as
// `JP-13` / `US-MA`; the JSON files key by `jp13` / `usma` (lowercase,
// no hyphen — matches CLDR's normalization). Fallback chain is
// requested lang → en → original code. Data is repo-owned (curated
// hand-maintained JSON, no external runtime dependency) and loaded
// per-language via dynamic import so the main bundle ships only the
// active language plus en (the fallback).
const SUBDIVISIONS: Record<string, Record<string, string>> = {};
const SUBDIVISION_LOADERS: Record<
  string,
  () => Promise<{ default: Record<string, string> }>
> = {
  en: () => import("./translations/subdivisions/en.json"),
  fi: () => import("./translations/subdivisions/fi.json"),
  ja: () => import("./translations/subdivisions/ja.json"),
};
const loadSubdivisions = async (lang: string): Promise<void> => {
  if (SUBDIVISIONS[lang]) return;
  const loader = SUBDIVISION_LOADERS[lang];
  if (!loader) return;
  const mod = await loader();
  SUBDIVISIONS[lang] = mod.default;
};
const subdivisionKey = (code: string): string =>
  code.toLowerCase().replace(/-/g, "");
const subdivisionName = (lang: string, code: string): string => {
  if (!code) return "";
  const key = subdivisionKey(code);
  return (
    SUBDIVISIONS[lang]?.[key] ?? SUBDIVISIONS.en?.[key] ?? code
  );
};

const exposure = (lang: string, t?: TFunction) => {
  const formatNumber = number(lang);
  return {
    focalLength: (focalLength: number): string => {
      if (isNaN(focalLength)) {
        return String(focalLength);
      }
      return formatNumber.default(focalLength);
    },
    aperture: (aperture: number): string => {
      if (isNaN(aperture)) {
        return String(aperture);
      }
      return `ƒ/${formatNumber.default(aperture)}`;
    },
    exposureTime: (exposureTime: number): string => {
      if (isNaN(exposureTime)) {
        return String(exposureTime);
      }
      if (exposureTime >= 1) {
        return formatNumber.default(exposureTime);
      }
      const fraction = Math.round(1 / exposureTime);
      return `1⁄${fraction}`;
    },
    iso: (iso: number): string => {
      if (isNaN(iso)) {
        return String(iso);
      }
      return String(iso);
    },
    ev: (ev: number): string => {
      if (isNaN(ev)) {
        return String(ev);
      }
      return formatNumber.default(Math.round(ev * 2) / 2);
    },
    resolution: (resolution: number): string => {
      if (isNaN(resolution)) {
        return String(resolution);
      }
      return formatNumber.default(resolution);
    },
    orientation: (value: string): string =>
      t ? String(t(`stats-orientation-${value}`)) : value,
    aspectRatio: (aspectRatio: number): string => {
      if (isNaN(aspectRatio)) {
        return String(aspectRatio);
      }
      return String(aspectRatio);
    },
  };
};

const gear = (
  make?: string,
  model?: string
): string | undefined => {
  if (!make && !model) return undefined;
  if (!make) return model;
  if (!model) return make;
  if (model.startsWith(make)) {
    return model;
  }
  return [make, model].join(" ");
};

// Hand-assembled geocoded address: city + (optional) state + country.
// Per-language order + separator. Flag is positioned alongside the
// country, so the caller asks geocodedFlagPosition() to decide which
// side to render the FlagIcon on. State is included only when the
// caller passes a non-empty value — non-beta callers omit it.
interface GeocodedParts {
  country?: string;
  state?: string;
  city?: string;
}
const ADDRESS_FORMAT: Record<string, { order: "lts" | "stl"; sep: string }> = {
  en: { order: "stl", sep: ", " },
  fi: { order: "stl", sep: ", " },
  ja: { order: "lts", sep: " " },
};
const geocodedAddress = (lang: string, parts: GeocodedParts): string => {
  const f = ADDRESS_FORMAT[lang] ?? ADDRESS_FORMAT.en;
  const ordered =
    f.order === "lts"
      ? [parts.country, parts.state, parts.city]
      : [parts.city, parts.state, parts.country];
  return ordered.filter(Boolean).join(f.sep);
};
const geocodedFlagPosition = (lang: string): "start" | "end" => {
  const f = ADDRESS_FORMAT[lang] ?? ADDRESS_FORMAT.en;
  return f.order === "lts" ? "start" : "end";
};

interface CityTuple {
  country: string;
  state: string;
  city: string;
}
const parseCityKey = (key: string): CityTuple => {
  try {
    const arr = JSON.parse(key) as unknown[];
    if (Array.isArray(arr) && arr.length === 3) {
      return {
        country: String(arr[0] ?? ""),
        state: String(arr[1] ?? ""),
        city: String(arr[2] ?? ""),
      };
    }
  } catch {
    /* fall through */
  }
  return { country: "", state: "", city: key };
};
// Map of cityKey → display label. A bare city name is fine when unique;
// when two entries share the same city, each gets a qualifier appended
// (state if present, else country name).
const buildCityLabels = (
  keys: string[],
  formatCountry: (code: string) => string
): Record<string, string> => {
  const parsed = keys.map((k) => ({ key: k, ...parseCityKey(k) }));
  const byCity: Record<string, typeof parsed> = {};
  for (const p of parsed) {
    (byCity[p.city] ??= []).push(p);
  }
  const labels: Record<string, string> = {};
  for (const group of Object.values(byCity)) {
    if (group.length === 1) {
      labels[group[0].key] = group[0].city;
      continue;
    }
    for (const p of group) {
      const qualifier =
        p.state || (p.country ? formatCountry(p.country) : "");
      labels[p.key] = qualifier ? `${p.city}, ${qualifier}` : p.city;
    }
  }
  return labels;
};

const coordinates = (latitude: number, longitude: number): string => {
  return new GeoCoord(latitude, longitude).roundToSeconds().toString();
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ValueFormatter = (value: any) => string;
const categoryValue =
  (lang: string, t: TFunction, countryData: CountryData) =>
  (category: string): ValueFormatter => {
    const formatExposure = exposure(lang, t);
    switch (category) {
      case "author":
        return identity as ValueFormatter;
      case "country":
        return countryName(lang, countryData) as ValueFormatter;
      case "state":
        return ((code: string) => subdivisionName(lang, code)) as ValueFormatter;
      case "city":
        return identity as ValueFormatter;
      case "geotagged":
        return ((value: string) =>
          t(`stats-geotagged-${value}`)) as ValueFormatter;
      case "year-month":
        return ((yearMonth: string) => {
          const [year, month] = yearMonth.split("-");
          return t("stats-year-month", {
            year: Number(year),
            month: t(`month-long-${Number(month)}`),
          });
        }) as ValueFormatter;
      case "year":
        return identity as ValueFormatter;
      case "month":
        return ((month: number) => t(`month-long-${month}`)) as ValueFormatter;
      case "weekday":
        return ((dow: number) =>
          t(`weekday-long-${dayOfWeek(dow)}`)) as ValueFormatter;
      case "hour":
        return ((hour: number) =>
          `${padNumber(hour, 2)}:00–`) as ValueFormatter;
      case "camera-make":
      case "camera":
      case "lens":
        return identity as ValueFormatter;
      case "camera-lens":
        return ((cameraLens: string) =>
          (JSON.parse(cameraLens) as (string | null)[])
            .map((value) => (value ? value : String(t("stats-unknown"))))
            .join(" + ")) as ValueFormatter;
      case "focal-length":
        return formatExposure.focalLength as ValueFormatter;
      case "aperture":
        return formatExposure.aperture as ValueFormatter;
      case "exposure-time":
        return formatExposure.exposureTime as ValueFormatter;
      case "iso":
        return formatExposure.iso as ValueFormatter;
      case "ev":
      case "lv":
        return formatExposure.ev as ValueFormatter;
      case "resolution":
        return formatExposure.resolution as ValueFormatter;
      case "orientation":
        return ((value: string) =>
          t(`stats-orientation-${value}`)) as ValueFormatter;
      case "aspect-ratio":
        return formatExposure.aspectRatio as ValueFormatter;
      default:
        return identity as ValueFormatter;
    }
  };

type Comparator<T> = (a: T, b: T) => number;
const categorySorter =
  (
    keyField: string,
    valueField: string,
    firstWeekday: number = config.FIRST_WEEKDAY
  ) =>
  (category: string): Comparator<Record<string, any>> => {
    switch (category) {
      case "author":
      case "country":
      case "state":
      case "city":
        return collection.strSortByFieldAsc(valueField) as Comparator<
          Record<string, any>
        >;
      case "year-month":
        return ((a: Record<string, string>, b: Record<string, string>) => {
          const [yearA, monthA] = a[keyField].split("-");
          const [yearB, monthB] = b[keyField].split("-");
          const yearComparison = collection.numSortByFieldAsc(keyField)(
            { [keyField]: yearA },
            { [keyField]: yearB }
          );
          if (yearComparison !== 0) {
            return yearComparison;
          }
          return collection.numSortByFieldAsc(keyField)(
            { [keyField]: monthA },
            { [keyField]: monthB }
          );
        }) as Comparator<Record<string, any>>;
      case "year":
      case "month":
        return collection.numSortByFieldAsc(keyField) as Comparator<
          Record<string, any>
        >;
      case "weekday":
        return ((a: Record<string, number>, b: Record<string, number>) => {
          const dowA =
            a[keyField] < firstWeekday ? Number(a[keyField]) + 7 : a[keyField];
          const dowB =
            b[keyField] < firstWeekday ? Number(b[keyField]) + 7 : b[keyField];
          return collection.compareWithNaN(dowA, dowB, () => dowA - dowB);
        }) as Comparator<Record<string, any>>;
      case "hour":
        return collection.numSortByFieldAsc(keyField) as Comparator<
          Record<string, any>
        >;
      case "camera-make":
      case "camera":
      case "lens":
      case "camera-lens":
        return collection.strSortByFieldAsc(keyField) as Comparator<
          Record<string, any>
        >;
      case "focal-length":
      case "aperture":
      case "exposure-time":
      case "iso":
      case "ev":
      case "lv":
      case "resolution":
      case "aspect-ratio":
        return collection.numSortByFieldAsc(keyField) as Comparator<
          Record<string, any>
        >;
      default:
        return (() => 0) as Comparator<Record<string, any>>;
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
  subdivisionName,
  loadSubdivisions,

  exposure,
  gear,
  geocodedAddress,
  geocodedFlagPosition,
  parseCityKey,
  buildCityLabels,
  coordinates,

  categoryValue,
  categorySorter,
};
