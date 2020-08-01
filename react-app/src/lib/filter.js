const categoriesByTopic = [
  { key: "general", value: ["summary", "author", "country"] },
  {
    key: "time",
    value: ["year", "year-month", "month", "weekday", "hour"],
  },
  { key: "gear", value: ["camera-make", "camera", "lens", "camera-lens"] },
  {
    key: "exposure",
    value: [
      "focal-length",
      "aperture",
      "exposure-time",
      "iso",
      "ev",
      "lv",
      "resolution",
    ],
  },
];

const normalizeKeyValue = (key, unknownLabel) => {
  try {
    return JSON.stringify(
      JSON.parse(key).map((part) => (part === unknownLabel ? undefined : part))
    );
  } catch (e) {
    return key === unknownLabel ? undefined : key;
  }
};

const applyNewFilter = (filters, category, key, unknownLabel) => {
  if (!category) {
    return filters;
  }
  const normalizedKey = normalizeKeyValue(key, unknownLabel);
  const newFilter = (photo) => photo.matches(category, normalizedKey);

  const newFilters = { ...filters };
  if (!(category in newFilters)) {
    newFilters[category] = { [key]: newFilter };
    return newFilters;
  }
  newFilters[category] = { ...newFilters[category] };
  if (!(key in newFilters[category])) {
    newFilters[category][key] = newFilter;
    return newFilters;
  }
  delete newFilters[category][key];
  if (!Object.keys(newFilters[category]).length) {
    delete newFilters[category];
  }
  return newFilters;
};

export default { categoriesByTopic, applyNewFilter };
