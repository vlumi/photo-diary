interface Matchable {
  matches: (category: string, key: string | undefined) => boolean;
}
type FilterFn = (photo: Matchable) => boolean;
export type Filters = Record<string, Record<string, Record<string, FilterFn>>>;

const topics = (): string[] => ["general", "time", "gear", "exposure"];

const categories = (category: string): string[] => {
  switch (category) {
    case "general":
      return ["author", "country"];
    case "time":
      return ["year", "year-month", "month", "weekday", "hour"];

    case "gear":
      return ["camera-make", "camera", "lens", "camera-lens"];
    case "exposure":
      return [
        "focal-length",
        "aperture",
        "exposure-time",
        "iso",
        "ev",
        "lv",
        "resolution",
        "orientation",
        "aspect-ratio",
      ];
    default:
      return [];
  }
};

const normalizeKeyValue = (
  key: string,
  unknownLabel: string
): string | undefined => {
  try {
    return JSON.stringify(
      (JSON.parse(key) as unknown[]).map((part) =>
        part === unknownLabel ? undefined : part
      )
    );
  } catch (_e) {
    return key === unknownLabel ? undefined : key;
  }
};

const newEmptyTopic = (filters: Filters, topic: string): Filters => {
  const newFilters: Filters = { ...filters };
  if (!(topic in newFilters)) {
    newFilters[topic] = {};
  }
  return newFilters;
};
const removeTopic = (filters: Filters, topic: string): Filters => {
  const newFilters: Filters = { ...filters };
  delete newFilters[topic];
  return newFilters;
};

const newEmptyCategory = (
  filters: Filters,
  topic: string,
  category: string
): Filters => {
  const newFilters: Filters = { ...filters };
  if (!(topic in newFilters)) {
    newFilters[topic] = {};
  }
  if (!(category in newFilters[topic])) {
    newFilters[topic][category] = {};
  }
  return newFilters;
};
const removeCategory = (
  filters: Filters,
  topic: string,
  category: string
): Filters => {
  const newFilters: Filters = { ...filters };
  if (topic in newFilters) {
    delete newFilters[topic][category];
  }
  if (topic in newFilters && !Object.keys(newFilters[topic]).length) {
    delete newFilters[topic];
  }
  return newFilters;
};

const applyNewFilter = (
  filters: Filters,
  topic: string,
  category: string,
  key: string,
  unknownLabel: string
): Filters => {
  if (!topic || !category) {
    return filters;
  }

  const newFilters: Filters = { ...filters };

  const normalizedKey = normalizeKeyValue(key, unknownLabel);
  const newFilter: FilterFn = (photo) => photo.matches(category, normalizedKey);

  if (!(topic in newFilters)) {
    newFilters[topic] = { [category]: { [key]: newFilter } };
    return newFilters;
  }
  if (!(category in newFilters[topic])) {
    newFilters[topic][category] = { [key]: newFilter };
    return newFilters;
  }
  newFilters[topic][category] = { ...newFilters[topic][category] };
  if (!(key in newFilters[topic][category])) {
    newFilters[topic][category][key] = newFilter;
    return newFilters;
  }
  delete newFilters[topic][category][key];
  if (!Object.keys(newFilters[topic][category]).length) {
    delete newFilters[topic][category];
  }
  if (!Object.keys(newFilters[topic]).length) {
    delete newFilters[topic];
  }
  return newFilters;
};

export default {
  topics,
  categories,
  newEmptyTopic,
  removeTopic,
  newEmptyCategory,
  removeCategory,
  applyNewFilter,
};
