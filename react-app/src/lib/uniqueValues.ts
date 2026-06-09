import type { TFunction } from "i18next";

import collection from "./collection";
import format from "./format";
import stats, {
  type UniqueValueEntry,
  type UniqueValues,
} from "./stats";

import type { Photo as PhotoT } from "../models/PhotoModel";

interface CountryData {
  getName(code: string, lang: string): string | undefined;
}

// Topic → categories mapping. Mirrors PhotoModel.uniqueValues(): the
// filter UI groups categories under topics ("general" / "time" /
// "gear" / "exposure"). The server returns a flat
// `Record<category, string[]>` from /filter-values (#532); this
// shape is the only place that knows where each category lives.
const TOPICS: Record<string, string[]> = {
  general: ["author", "country", "state", "city", "geotagged"],
  time: ["year", "year-month", "month", "weekday", "hour"],
  gear: ["camera-make", "camera", "lens", "camera-lens"],
  exposure: [
    "focal-length",
    "focal-length-eq",
    "aperture",
    "exposure-time",
    "iso",
    "ev",
    "lv",
    "resolution",
    "orientation",
    "aspect-ratio",
  ],
};

// Categories that should be presented as numbers in the filter UI
// (sorter + formatter pick the right path). Mirrors PhotoModel's
// uniqueValues() Set entry types — anything not listed here is
// treated as a string key.
const NUMERIC_CATEGORIES = new Set([
  "year",
  "month",
  "weekday",
  "hour",
  "focal-length",
  "focal-length-eq",
  "aperture",
  "exposure-time",
  "iso",
  "ev",
  "lv",
]);

// Server response shape from /filter-values. The keys are kebab-case
// category names matching the filter wire format; values are the
// distinct keys present in the unfiltered photo set (`null` would
// indicate the "unknown" bucket, but the server emits empty string
// for that — both get normalized to `stats.UNKNOWN` here).
export interface FilterValuesPayload {
  categoryValues: Record<string, string[]>;
  byCityLocalized: Record<string, string>;
}

const buildCityLabels = (
  cityKeys: string[],
  lang: string,
  countryData: CountryData,
  cityLocalizedByKey: Record<string, string>
): Record<string, string> => {
  const formatCountryName = format.countryName(lang, countryData);
  return format.buildCityLabels(
    cityKeys.filter((v): v is string => typeof v === "string" && !!v),
    lang,
    formatCountryName,
    cityLocalizedByKey
  );
};

// Build the per-topic / per-category UniqueValues bag the filter UI
// consumes from the server's /filter-values payload (#532). The
// server returns the universe of keys per category (already
// deduplicated + sorted); this layer maps them to the topic-nested
// shape, applies localization for country/city labels + numeric
// formatting for numeric categories, then sorts each category in
// its natural order.
export const buildUniqueValues = (
  payload: FilterValuesPayload,
  lang: string,
  t: TFunction,
  countryData: CountryData
): UniqueValues => {
  const { categoryValues, byCityLocalized } = payload;
  const categoryValueFormatter = format.categoryValue(lang, t, countryData);
  const out: UniqueValues = {} as UniqueValues;
  for (const [topic, categories] of Object.entries(TOPICS)) {
    const topicBag: Record<string, UniqueValueEntry[]> = {};
    for (const category of categories) {
      const rawKeys = categoryValues[category] ?? [];
      const cityLabels =
        category === "city"
          ? buildCityLabels(rawKeys, lang, countryData, byCityLocalized)
          : null;
      const isNumeric = NUMERIC_CATEGORIES.has(category);
      const entries = rawKeys.map((raw): UniqueValueEntry => {
        if (raw === "" || raw === null || raw === undefined) {
          return {
            key: stats.UNKNOWN,
            value: String(t("stats-unknown")),
          };
        }
        if (cityLabels) {
          return {
            key: raw,
            value: cityLabels[raw] ?? String(raw),
          };
        }
        const typedKey: string | number = isNumeric ? Number(raw) : raw;
        return {
          key: typedKey,
          value: categoryValueFormatter(category)(typedKey),
        };
      });
      topicBag[category] = entries.sort(
        format.categorySorter("key", "value")(category)
      );
    }
    (out as Record<string, Record<string, UniqueValueEntry[]>>)[topic] =
      topicBag;
  }
  return out;
};

// Legacy photo-walking variant. Kept alive for the global stats
// page (admin), which still fetches the cross-gallery photo array
// and derives the universe client-side. A follow-up will swap this
// out for a global-flavour /filter-values endpoint and delete this
// function.
export const buildUniqueValuesFromPhotos = (
  photos: PhotoT[],
  lang: string,
  t: TFunction,
  countryData: CountryData
): UniqueValues => {
  const accumulator: Record<string, Record<string, Set<unknown>>> = photos
    .map((photo) => photo.uniqueValues())
    .reduce(
      collection.mergeObjects<unknown>(
        (a, b) => new Set([...a, ...b]) as Set<unknown>
      ),
      {}
    ) as Record<string, Record<string, Set<unknown>>>;
  const categoryValueFormatter = format.categoryValue(lang, t, countryData);
  const formatCountryName = format.countryName(lang, countryData);
  const flattened: UniqueValues = {} as UniqueValues;
  Object.keys(accumulator).forEach((topic) => {
    const topicBag: Record<string, UniqueValueEntry[]> = {};
    Object.keys(accumulator[topic]).forEach((category) => {
      const cityLocalizedByKey: Record<string, string> =
        category === "city"
          ? photos.reduce<Record<string, string>>((acc, photo) => {
              const k = photo.geocodedCityKey();
              const v = photo.geocodedCity();
              if (k && v && !acc[k]) acc[k] = v;
              return acc;
            }, {})
          : {};
      const cityLabels =
        category === "city"
          ? format.buildCityLabels(
              [...accumulator[topic][category]].filter(
                (v): v is string => typeof v === "string" && !!v
              ),
              lang,
              formatCountryName,
              cityLocalizedByKey
            )
          : null;
      topicBag[category] = [...accumulator[topic][category]]
        .map((value) => {
          if (value === "" || value === undefined || value === null) {
            return {
              key: stats.UNKNOWN,
              value: String(t("stats-unknown")),
            };
          }
          if (cityLabels) {
            return {
              key: value as string,
              value: cityLabels[value as string] ?? String(value),
            };
          }
          return {
            key: value as string | number,
            value: categoryValueFormatter(category)(value),
          };
        })
        .sort(format.categorySorter("key", "value")(category));
    });
    (flattened as Record<string, Record<string, UniqueValueEntry[]>>)[topic] =
      topicBag;
  });
  return flattened;
};
