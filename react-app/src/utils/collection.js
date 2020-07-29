/**
 * Join a conditional list of keys, where the inclusion of each key is determined on the truthiness of its value.
 *
 * @param {object} map The source data.
 * @param {string} separator The separator used for joining the keys.
 * @return {string} The keys whose values are truthy, joined by the separator.
 */
const joinTruthyKeys = (map, separator = " ") =>
  Object.keys(map)
    .filter((key) => map[key])
    .join(separator);

/**
 * Compare two arrays' contents.
 *
 * - The first element from the beginning to differ will determine the order.
 * - If one array is shorter, and its elements are equal to the other, the shorter element is considered smaller.
 * - If all elements are equal, the arrays are considered equal.
 *
 * @param {array} a
 * @param {array} b
 * @return {number} `0` if the arrays are equal, a negative value if `a` is smaller, a positive value if `b` is smaller.
 */
const compareArrays = (a, b) => {
  if (typeof a !== "object" && typeof b !== "object") {
    return undefined;
  }
  if (typeof a !== "object") {
    return undefined;
  }
  if (typeof b !== "object") {
    return undefined;
  }
  const maxLength = Math.max(a.length, b.length);
  for (const i in [...Array(maxLength).keys()]) {
    if (b.length <= i) {
      return -1;
    }
    if (a.length <= i) {
      return 1;
    }
    if (a[i] > b[i]) {
      return -1;
    }
    if (a[i] < b[i]) {
      return 1;
    }
  }
  return 0;
};

// TODO: remove?
const transformObjectKeys = (data, f) => {
  return Object.fromEntries(Object.keys(data).map(f));
};

const transformObjectValue = (data, key, transformer) => {
  return {
    ...data,
    [key]: transformer(data),
  };
};

const objectFromArray = (source, value) =>
  source.reduce((a, b) => {
    a[b] = value;
    return a;
  }, {});

const truncateAndProcess = (
  data,
  maxEntries,
  doMap,
  summaryLabel,
  summarizer
) => {
  if (maxEntries > 0 && data.length > maxEntries) {
    const other = summarizer(data.slice(maxEntries));
    return doMap([
      ...data.slice(0, maxEntries),
      { key: summaryLabel, value: other },
    ]);
  }
  return doMap(data);
};

const compareWithNaN = (a, b, f) => {
  if (isNaN(a) && isNaN(b)) return 0;
  if (isNaN(a)) return 1;
  if (isNaN(b)) return -1;
  return f();
};

const numSortByFieldAsc = (key) => (a, b) =>
  compareWithNaN(a[key], b[key], () => a[key] - b[key]);
const numSortByFieldDesc = (key) => (a, b) =>
  compareWithNaN(a[key], b[key], () => b[key] - a[key]);

export default {
  joinTruthyKeys,
  compareArrays,
  transformObjectKeys,
  transformObjectValue,
  objectFromArray,
  truncateAndProcess,

  numSortByFieldAsc,
  numSortByFieldDesc,
};
