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

// Build the per-topic / per-category UniqueValues bag the stats UI
// consumes. Pure transform: in → photos, lang, t, countryData;
// out → UniqueValues. The per-gallery `/g/<id>/...` and the global
// `/s` view both build the same shape over their respective photo
// arrays, so the logic stays in one place.
export const buildUniqueValues = (
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
