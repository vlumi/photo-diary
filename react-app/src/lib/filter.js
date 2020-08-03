const topics = () => ["general", "time", "gear", "exposure"];

const categories = (category) => {
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
      ];
    default:
      return [];
  }
};

const normalizeKeyValue = (key, unknownLabel) => {
  try {
    return JSON.stringify(
      JSON.parse(key).map((part) => (part === unknownLabel ? undefined : part))
    );
  } catch (e) {
    return key === unknownLabel ? undefined : key;
  }
};

const newEmptyTopic = (filters, topic) => {
  const newFilters = { ...filters };
  if (!(topic in newFilters)) {
    newFilters[topic] = {};
  }
  return newFilters;
};
const removeTopic = (filters, topic) => {
  const newFilters = { ...filters };
  delete newFilters[topic];
  return newFilters;
};

const newEmptyCategory = (filters, topic, category) => {
  const newFilters = { ...filters };
  if (!(topic in newFilters)) {
    newFilters[topic] = {};
  }
  if (!(category in newFilters[topic])) {
    newFilters[topic][category] = {};
  }
  return newFilters;
};
const removeCategory = (filters, topic, category) => {
  const newFilters = { ...filters };
  if (topic in newFilters) {
    delete newFilters[topic][category];
  }
  if (topic in newFilters && !Object.keys(newFilters[topic]).length) {
    delete newFilters[topic];
  }
  return newFilters;
};

const applyNewFilter = (filters, topic, category, key, unknownLabel) => {
  if (!topic || !category) {
    return filters;
  }

  const newFilters = { ...filters };

  const normalizedKey = normalizeKeyValue(key, unknownLabel);
  const newFilter = (photo) => photo.matches(category, normalizedKey);

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
