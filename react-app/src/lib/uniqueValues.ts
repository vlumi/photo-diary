import type { TFunction } from "i18next";

import format from "./format";
import stats, {
  type UniqueValueEntry,
  type UniqueValues,
} from "./stats";

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
//
// `categoryCounts` carries per-value photo counts in the same kebab-
// case category namespace. Drives the filter widget's top-N sort.
// Empty `{}` is fine for synthetic categories that aren't bucketed
// server-side (`geotagged`, `year-month`).
export interface FilterValuesPayload {
  categoryValues: Record<string, string[]>;
  categoryCounts: Record<string, Record<string, number>>;
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
  const { categoryValues, categoryCounts, byCityLocalized } = payload;
  const categoryValueFormatter = format.categoryValue(lang, t, countryData);
  const out: UniqueValues = {} as UniqueValues;
  for (const [topic, categories] of Object.entries(TOPICS)) {
    const topicBag: Record<string, UniqueValueEntry[]> = {};
    for (const category of categories) {
      const rawKeys = categoryValues[category] ?? [];
      const rawCounts = categoryCounts?.[category] ?? {};
      const cityLabels =
        category === "city"
          ? buildCityLabels(rawKeys, lang, countryData, byCityLocalized)
          : null;
      const isNumeric = NUMERIC_CATEGORIES.has(category);
      const entries = rawKeys.map((raw): UniqueValueEntry => {
        const count = rawCounts[raw];
        if (raw === "" || raw === null || raw === undefined) {
          return {
            key: stats.UNKNOWN,
            value: String(t("stats-unknown")),
            count,
          };
        }
        if (cityLabels) {
          return {
            key: raw,
            value: cityLabels[raw] ?? String(raw),
            count,
          };
        }
        const typedKey: string | number = isNumeric ? Number(raw) : raw;
        return {
          key: typedKey,
          value: categoryValueFormatter(category)(typedKey),
          count,
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
