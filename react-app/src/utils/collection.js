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

/**
 * Transform all of the property keys of the object, passing the old key and value of each property to the transformer
 *
 * @param {object} data
 * @param {function} transformer
 */
const transformObjectKeys = (data, transformer) => {
  return Object.fromEntries(
    Object.keys(data).map((key) => transformer(key, data[key]))
  );
};

/**
 * Transform the value of a property, returning a new shallow copy of the object.
 *
 * @param {object} data
 * @param {string} key
 * @param {function} transformer
 */
const transformObjectValue = (data, key, transformer) => {
  return {
    ...data,
    [key]: transformer(data),
  };
};

/**
 * Trim leading and trailing elements of the array that do not match the given predicate.
 *
 * @param {array} data The array to trim.
 * @param {function} predicate The predicate should return true for elements that should be kept.
 */
const trim = (data, predicate) => {
  if (data.length === 0) {
    return data;
  }
  let first = 0;
  while (first < data.length && !predicate(data[first])) {
    first++;
  }
  let last = data.length - 1;
  while (last >= 0 && !predicate(data[last])) {
    last--;
  }
  if (first > last) {
    return [];
  }
  if (first === last) {
    return [data[first]];
  }
  return data.slice(first, last + 1);
};

/**
 * Transform an array into object, with the array values as keys and the given value as
 * the value of each property.
 *
 * @param {array} data The array to transform.
 * @param {any} value The value to set to each property.
 */
const objectFromArray = (data, value) =>
  data.reduce((a, b) => {
    a[b] = value;
    return a;
  }, {});

/**
 * Truncate the given array `data` to at most `maxEntries` elements. The rest of the elements
 * will be summarized into a new element at the end using `summarizer`. The truncated array
 * with the summarized data is passed to `processor`
 *
 * @param {array} data The array to truncate and process.
 * @param {number} maxEntries Maximum number of entries to allow, or zero to not truncate.
 * @param {function} processor The function to send the truncated and summarized data.
 * @param {function} summarizer The function to summarize the truncated elements.
 */
const truncateAndProcess = (data, maxEntries, processor, summarizer) => {
  if (maxEntries > 0 && data.length > maxEntries) {
    const other = summarizer(data.slice(maxEntries));
    return processor([
      ...data.slice(0, maxEntries),
      summarizer(data.slice(maxEntries)),
    ]);
  }
  return processor(data);
};

const compareWithNaN = (a, b, f) => {
  if (isNaN(a) && isNaN(b)) return 0;
  if (isNaN(a)) return 1;
  if (isNaN(b)) return -1;
  return f();
};

/**
 * Sort the object-containing array by the property `key` in numeric ascending order.
 *
 * Any non-numeric fields will be placed at the end, in non-deterministic order.
 *
 * @param {string} key The property to sort by.
 */
const numSortByFieldAsc = (key) => (a, b) =>
  compareWithNaN(a[key], b[key], () => a[key] - b[key]);

/**
 * Sort the object-containing array by the property `key` in numeric descending order.
 *
 * Any non-numeric fields will be placed at the end, in non-deterministic order.
 *
 * @param {string} key The property to sort by.
 */
const numSortByFieldDesc = (key) => (a, b) =>
  compareWithNaN(a[key], b[key], () => b[key] - a[key]);

export default {
  joinTruthyKeys,
  compareArrays,
  transformObjectKeys,
  transformObjectValue,
  objectFromArray,
  truncateAndProcess,
  trim,

  numSortByFieldAsc,
  numSortByFieldDesc,
};
