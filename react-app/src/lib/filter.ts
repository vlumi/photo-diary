interface Matchable {
  matches: (category: string, key: string | undefined) => boolean;
}
type FilterFn = (photo: Matchable) => boolean;
export type Filters = Record<string, Record<string, Record<string, FilterFn>>>;

const topics = (): string[] => [
  "general",
  "time",
  "gear",
  "settings",
  "image",
  "light",
];

const categories = (category: string): string[] => {
  switch (category) {
    case "general":
      return ["author", "country", "state", "city", "geotagged"];
    case "time":
      return ["date-range", "year", "year-month", "month", "weekday", "hour"];
    case "gear":
      return ["camera-make", "camera", "lens", "camera-lens"];
    case "settings":
      return ["focal-length", "focal-length-eq", "aperture", "exposure-time", "iso"];
    case "image":
      return ["resolution", "aspect-ratio", "orientation"];
    case "light":
      return ["ev", "lv"];
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

// Server wire shape: drop the FilterFn closures, extract just the
// keys per (topic, category). Used by the upcoming stats endpoint
// rewire — the server eval expects `null` for the "<unknown>"
// bucket, so this serializer maps the client's `stats.UNKNOWN`
// sentinel (the literal string "unknown") to `null` on the wire.
// JSON-encoded compound keys (camera-lens, city) keep their string
// form; the server eval parses them at predicate time.
export type ServerFilterKey = string | null;
export type ServerFilters = Record<
  string,
  Record<string, ServerFilterKey[]>
>;

const UNKNOWN_SENTINEL = "unknown";

const toServerKey = (key: string): ServerFilterKey =>
  key === UNKNOWN_SENTINEL ? null : key;

// Inverse of `toServerFilters` for hydrating local edit state from
// a stored / loaded ServerFilters envelope (e.g. saved-filter
// definitions, URL state). The reconstructed closures match what
// `applyNewFilter` would produce — `photo.matches(category, key)`
// against the same normalized key shape, so the resulting Filters
// tree behaves identically to one the operator built chip-by-chip.
const fromServerFilters = (server: ServerFilters | undefined): Filters => {
  const out: Filters = {};
  if (!server) return out;
  for (const [topic, cats] of Object.entries(server)) {
    if (!cats) continue;
    const topicOut: Record<string, Record<string, FilterFn>> = {};
    for (const [category, keys] of Object.entries(cats)) {
      if (!Array.isArray(keys) || keys.length === 0) continue;
      const catOut: Record<string, FilterFn> = {};
      for (const k of keys) {
        const keyStr = k === null ? UNKNOWN_SENTINEL : String(k);
        catOut[keyStr] = (photo) => photo.matches(category, k === null ? undefined : keyStr);
      }
      topicOut[category] = catOut;
    }
    if (Object.keys(topicOut).length > 0) out[topic] = topicOut;
  }
  return out;
};

const toServerFilters = (filters: Filters): ServerFilters => {
  const out: ServerFilters = {};
  for (const [topic, categories] of Object.entries(filters)) {
    const topicOut: Record<string, ServerFilterKey[]> = {};
    for (const [category, keyRecord] of Object.entries(categories)) {
      const keys = Object.keys(keyRecord);
      if (keys.length === 0) continue;
      topicOut[category] = keys.map(toServerKey);
    }
    if (Object.keys(topicOut).length > 0) out[topic] = topicOut;
  }
  return out;
};

export default {
  topics,
  categories,
  newEmptyTopic,
  removeTopic,
  newEmptyCategory,
  removeCategory,
  applyNewFilter,
  toServerFilters,
  fromServerFilters,
};
