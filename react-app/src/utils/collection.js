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

const transformObjectKeys = (data, f) => {
  return Object.fromEntries(Object.keys(data.count.byTime.byDayOfWeek).map(f));
};

export default {
  joinTruthyKeys,
  compareArrays,
  transformObjectKeys,
};
