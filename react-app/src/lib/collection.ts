/**
 * Join a conditional list of keys, where the inclusion of each key is determined on the truthiness of its value.
 */
const joinTruthyKeys = (
  map: Record<string, unknown>,
  separator = " "
): string =>
  Object.keys(map)
    .filter((key) => map[key])
    .join(separator);

const compareWithNaN = (
  a: number,
  b: number,
  f: (a: number, b: number) => number
): number => {
  if (isNaN(a) && isNaN(b)) return 0;
  if (isNaN(a)) return 1;
  if (isNaN(b)) return -1;
  return f(a, b);
};

/**
 * Compare two arrays' contents, assuming numeric content.
 */
const compareArrays = (a: unknown, b: unknown): number | undefined => {
  if (!Array.isArray(a) && !Array.isArray(b)) {
    return undefined;
  }
  if (!Array.isArray(a)) {
    return undefined;
  }
  if (!Array.isArray(b)) {
    return undefined;
  }
  const maxLength = Math.max(a.length, b.length);
  for (let i = 0; i < maxLength; i++) {
    if (a.length <= i) {
      return -1;
    }
    if (b.length <= i) {
      return 1;
    }
    const result = compareWithNaN(a[i], b[i], (x, y) => {
      if (x > y) {
        return 1;
      }
      if (x < y) {
        return -1;
      }
      return 0;
    });
    if (result !== 0) {
      return result;
    }
  }
  return 0;
};

/**
 * Transform all of the property keys of the object, passing the old key and value of each property to the transformer
 */
const transformObjectKeys = <T,>(
  data: Record<string, T> | undefined | null,
  transformer: (key: string, value: T) => [string, T]
): Record<string, T> | undefined | null => {
  if (!data) {
    return data;
  }
  return Object.fromEntries(
    Object.keys(data).map((key) => transformer(key, data[key]))
  );
};

/**
 * Transform the value of a property, returning a new shallow copy of the object.
 */
const transformObjectValue = <T extends Record<string, unknown>>(
  data: T | undefined | null,
  key: string,
  transformer: (data: T) => unknown
): T | undefined | null => {
  if (!data || !(key in data)) {
    return data;
  }
  return {
    ...data,
    [key]: transformer(data),
  };
};

/**
 * Trim leading and trailing elements of the array that do not match the given predicate.
 */
const trim = <T,>(
  data: T[] | undefined | null,
  predicate: (e: T) => boolean = Boolean
): T[] => {
  if (!data || !data.length) {
    return [];
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
 */
const objectFromArray = <T,>(
  data: (string | number)[] | undefined | null,
  value?: T
): Record<string, T | undefined> => {
  if (!data || !data.length) {
    return {};
  }
  return data.reduce<Record<string, T | undefined>>(
    (accumulator, element) => {
      accumulator[String(element)] = value;
      return accumulator;
    },
    {}
  );
};

interface FoldEntry<T> {
  key: string;
  value: T;
}

/**
 *  Transform an object into an array of objects, with the original key in the property `key`,
 *  and the original value in the property `value`, sorting the resulting array with `comparator`.
 */
const foldToArray = <T,>(
  data: Record<string, T> | undefined | null,
  comparator?: (a: FoldEntry<T>, b: FoldEntry<T>) => number
): FoldEntry<T>[] => {
  if (!data || !Object.keys(data).length) {
    return [];
  }
  return Object.keys(data)
    .map((key) => ({ key, value: data[key] }))
    .sort(comparator);
};

/**
 * Produces an object with the values of the array as keys, and their respective sorted, 1-based rank as the value.
 *
 * In case of duplicate values, the lowest rank for the values will be chosen, producing a gap in the ranks.
 */
const calculateRanks = <T,>(
  data: T[] | undefined | null,
  valueMapper: (item: T) => number | string,
  comparator: (a: number | string, b: number | string) => number = (a, b) =>
    Number(b) - Number(a)
): Record<string, number> => {
  if (!data || !data.length) {
    return {};
  }
  return data
    .map(valueMapper)
    .sort(comparator)
    .reduce<Record<string, number>>((acc, value, index) => {
      const key = String(value);
      if (key in acc) {
        acc[key] = Math.min(index, acc[key]);
      } else {
        acc[key] = index;
      }
      return acc;
    }, {});
};

/**
 * Keep the first `maxEntries` items of `data` as-is and aggregate the
 * rest into a single summarized entry appended at the end. `processor`
 * receives the resulting array (top N + Other). If there's nothing past
 * the cap, no summary entry is added.
 */
const truncateAndProcess = <T, R>(
  data: T[] | undefined | null,
  maxEntries: number,
  processor: (items: T[]) => R,
  summarizer: (items: T[]) => T
): R => {
  if (maxEntries > 0 && data && data.length > maxEntries) {
    return processor([
      ...data.slice(0, maxEntries),
      summarizer(data.slice(maxEntries)),
    ]);
  }
  return processor(data ?? []);
};

type Merger<T> = (a: Set<T>, b: Set<T>) => Set<T>;

const mergeObjects =
  <T,>(merger: Merger<T>) =>
  (
    a: Record<string, unknown>,
    b: Record<string, unknown>
  ): Record<string, unknown> => {
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    return Object.fromEntries(
      [...keys].map((key) => {
        if (!(key in b)) {
          return [key, a[key]];
        }
        if (!(key in a)) {
          return [key, b[key]];
        }
        if (a[key] instanceof Set && b[key] instanceof Set) {
          return [key, merger(a[key] as Set<T>, b[key] as Set<T>)];
        }
        return [
          key,
          mergeObjects(merger)(
            a[key] as Record<string, unknown>,
            b[key] as Record<string, unknown>
          ),
        ];
      })
    );
  };

type WithField<K extends string> = Record<K, unknown>;

/**
 * Sort the object-containing array by the property `key` in numeric ascending order.
 *
 * Any non-numeric fields will be placed at the end, in non-deterministic order.
 */
const numSortByFieldAsc =
  <K extends string>(key: K) =>
  (a: WithField<K>, b: WithField<K>): number =>
    compareWithNaN(
      Number(a[key]),
      Number(b[key]),
      () => Number(a[key]) - Number(b[key])
    );

/**
 * Sort the object-containing array by the property `key` in numeric descending order.
 */
const numSortByFieldDesc =
  <K extends string>(key: K) =>
  (a: WithField<K>, b: WithField<K>): number =>
    compareWithNaN(
      Number(a[key]),
      Number(b[key]),
      () => Number(b[key]) - Number(a[key])
    );

/**
 * Sort the object-containing array by the property `key` in string ascending order.
 */
const strSortByFieldAsc =
  <K extends string>(key: K) =>
  (a: WithField<K>, b: WithField<K>): number =>
    String(a[key]).localeCompare(String(b[key]));

/**
 * Sort the object-containing array by the property `key` in string descending order.
 */
const strSortByFieldDesc =
  <K extends string>(key: K) =>
  (a: WithField<K>, b: WithField<K>): number =>
    String(b[key]).localeCompare(String(a[key]));

export default {
  joinTruthyKeys,
  compareArrays,
  transformObjectKeys,
  transformObjectValue,
  trim,
  objectFromArray,
  foldToArray,
  calculateRanks,
  truncateAndProcess,
  mergeObjects,

  compareWithNaN,
  numSortByFieldAsc,
  numSortByFieldDesc,
  strSortByFieldAsc,
  strSortByFieldDesc,
};
