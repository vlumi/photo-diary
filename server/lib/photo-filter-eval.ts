// Server-side evaluator for the stats endpoint's filter parameter.
// Mirrors the predicate matrix in `react-app/src/models/PhotoModel.ts`
// (`matches` switch); the wire shape is `react-app/src/lib/filter.ts`'s
// Filters tree with the closure dropped:
//
//   { [topic]: { [category]: [key, key, ...] } }
//
// Logic: OR within a category, AND across categories within a topic,
// AND across topics. Empty arrays / empty categories / empty topics
// drop the dimension. `null` as a key matches the "<unknown>" bucket —
// photos whose field is empty / undefined for that category.

import type { Photo } from "../db/sqlite3/schema.js";
import * as derived from "./photo-derived.js";

export type FilterKey = string | number | boolean | null;
export type FilterCategory = FilterKey[];
export type FilterTopic = Record<string, FilterCategory>;
export type FilterShape = Record<string, FilterTopic>;

const isEmpty = (v: string | null | undefined): boolean =>
  v === null || v === undefined || v === "";

// Compare a wire key (always a string on the network, but typed as
// FilterKey for callers that construct in JS) against a photo value
// that may be a number, string, or undefined. `null` on the wire
// matches the "<unknown>" bucket (photo value is empty).
const matchesString = (
  key: FilterKey,
  value: string | undefined | null
): boolean => {
  if (key === null) return isEmpty(value);
  if (isEmpty(value)) return false;
  return String(key) === value;
};

const matchesNumber = (
  key: FilterKey,
  value: number | undefined | null
): boolean => {
  if (key === null) return value === undefined || value === null;
  if (value === undefined || value === null) return false;
  // Wire form may arrive as the string "2.8" or the number 2.8 —
  // accept either, compare numerically so f/2.80 doesn't miss f/2.8.
  const n = typeof key === "number" ? key : Number(key);
  if (Number.isNaN(n)) return false;
  return n === value;
};

const formattedCamera = (photo: Photo): string | undefined =>
  derived.formatGear(photo.camera?.make, photo.camera?.model);

const formattedLens = (photo: Photo): string | undefined =>
  derived.formatGear(photo.lens?.make, photo.lens?.model);

const hasCamera = (photo: Photo): boolean =>
  !!(photo.camera && (photo.camera.make || photo.camera.model));

const hasLens = (photo: Photo): boolean =>
  !!(photo.lens && (photo.lens.make || photo.lens.model));

const geocodedCityKey = (photo: Photo): string | undefined => {
  const cityEn = photo.geocoded?.cityEn ?? photo.geocoded?.city;
  if (!cityEn) return undefined;
  return JSON.stringify([
    photo.geocoded?.countryCode ?? "",
    photo.geocoded?.stateCode ?? "",
    cityEn,
  ]);
};

const hasCoordinates = (photo: Photo): boolean =>
  !!(
    photo.taken.location?.coordinates?.latitude &&
    photo.taken.location?.coordinates?.longitude
  );

// Single category predicate: does this photo match `key` under
// `category`? OR-array semantics happen one level up.
const predicate = (
  category: string,
  key: FilterKey,
  photo: Photo
): boolean => {
  switch (category) {
    case "author":
      return matchesString(key, photo.taken.author);
    case "country":
      return matchesString(key, photo.taken.location?.country);
    case "state":
      return matchesString(key, photo.geocoded?.stateCode);
    case "city":
      return matchesString(key, geocodedCityKey(photo));
    case "geotagged":
      if (key === true || key === "yes") return hasCoordinates(photo);
      if (key === false || key === "no") return !hasCoordinates(photo);
      return false;
    case "year":
      return matchesNumber(key, photo.taken.instant.year);
    case "year-month":
      return (
        matchesString(
          key,
          `${photo.taken.instant.year}-${photo.taken.instant.month}`
        )
      );
    case "month":
      return matchesNumber(key, photo.taken.instant.month);
    case "weekday":
      return matchesNumber(
        key,
        derived.weekday(
          photo.taken.instant.year,
          photo.taken.instant.month,
          photo.taken.instant.day
        )
      );
    case "hour":
      return matchesNumber(key, photo.taken.instant.hour);
    case "camera-make":
      return matchesString(key, photo.camera?.make);
    case "camera":
      return matchesString(key, formattedCamera(photo));
    case "lens":
      return matchesString(key, formattedLens(photo));
    case "camera-lens": {
      if (key === null) return !hasCamera(photo) && !hasLens(photo);
      if (typeof key !== "string") return false;
      let pair: [string | null, string | null];
      try {
        pair = JSON.parse(key) as [string | null, string | null];
      } catch {
        return false;
      }
      const [cameraKey, lensKey] = pair;
      const cameraOk = cameraKey === null
        ? !hasCamera(photo)
        : cameraKey === formattedCamera(photo);
      const lensOk = lensKey === null
        ? !hasLens(photo)
        : lensKey === formattedLens(photo);
      return cameraOk && lensOk;
    }
    case "focal-length":
      return matchesNumber(key, photo.exposure?.focalLength);
    case "focal-length-eq":
      return matchesNumber(
        key,
        derived.focalLength35mmEquiv(
          photo.exposure?.focalLength,
          photo.camera?.make,
          photo.camera?.model,
          photo.exposure?.focalLength35mmEquiv
        )
      );
    case "aperture":
      return matchesNumber(key, photo.exposure?.aperture);
    case "exposure-time":
      return matchesNumber(key, photo.exposure?.exposureTime);
    case "iso":
      return matchesNumber(key, photo.exposure?.iso);
    case "ev":
      return matchesNumber(
        key,
        derived.exposureValue(
          photo.exposure?.aperture,
          photo.exposure?.exposureTime
        )
      );
    case "lv":
      return matchesNumber(
        key,
        derived.lightValue(
          photo.exposure?.aperture,
          photo.exposure?.exposureTime,
          photo.exposure?.iso
        )
      );
    case "resolution":
      return matchesNumber(
        key,
        derived.resolution(
          photo.dimensions?.original?.width,
          photo.dimensions?.original?.height
        )
      );
    case "orientation":
      return matchesString(
        key,
        derived.orientation(
          photo.dimensions?.original?.width,
          photo.dimensions?.original?.height
        )
      );
    case "aspect-ratio":
      return matchesString(
        key,
        derived.aspectRatio(
          photo.dimensions?.original?.width,
          photo.dimensions?.original?.height
        )
      );
    default:
      // Unknown category drops the dimension rather than rejecting
      // every photo — leaves room for client / server skew where one
      // side adds a category before the other catches up.
      return true;
  }
};

// Evaluate the full filter shape against a photo. Returns true when
// the photo passes every (topic, category) constraint.
export const matchesFilter = (
  filter: FilterShape | undefined | null,
  photo: Photo
): boolean => {
  if (!filter) return true;
  for (const topic of Object.keys(filter)) {
    const categories = filter[topic];
    if (!categories) continue;
    for (const category of Object.keys(categories)) {
      const keys = categories[category];
      if (!Array.isArray(keys) || keys.length === 0) continue;
      const anyMatch = keys.some((key) => predicate(category, key, photo));
      if (!anyMatch) return false;
    }
  }
  return true;
};

// Date-range filter — separate from the topic/category/key matrix
// of `FilterShape` because the predicate is structurally different
// (continuous range, not discrete-key OR). Both `from` and `to` are
// `YYYY-MM-DD` strings; inclusive on both ends. Either bound may be
// omitted for a half-open range (`from` only → "since"; `to` only →
// "until"). Empty / undefined range or both bounds missing → no
// constraint, all photos pass.
export interface DateRange {
  from?: string;
  to?: string;
}
export const matchesDateRange = (
  range: DateRange | undefined | null,
  photo: Photo
): boolean => {
  if (!range) return true;
  const { from, to } = range;
  if (!from && !to) return true;
  const instant = photo.taken.instant;
  if (!instant) return false;
  const ymd =
    `${instant.year}-${String(instant.month).padStart(2, "0")}-${String(instant.day).padStart(2, "0")}`;
  if (from && ymd < from) return false;
  if (to && ymd > to) return false;
  return true;
};

// Numeric range filters for continuous exposure fields (focal
// length, aperture, exposure time, ISO, EV, LV). Same half-open
// shape as date-range — either bound may be omitted. Empty `{}`
// or both bounds missing → no constraint. Keyed by the same
// kebab-case category names as FilterShape; cross-category logic
// is AND. A photo with the value missing fails the range, mirroring
// the discrete-filter rule for an "unknown" exclusion.
export interface NumericRange {
  min?: number;
  max?: number;
}
export type NumericRanges = Record<string, NumericRange>;

const numericValueFor = (
  category: string,
  photo: Photo
): number | undefined | null => {
  switch (category) {
    case "focal-length":
      return photo.exposure?.focalLength;
    case "focal-length-eq":
      return derived.focalLength35mmEquiv(
        photo.exposure?.focalLength,
        photo.camera?.make,
        photo.camera?.model,
        photo.exposure?.focalLength35mmEquiv
      );
    case "aperture":
      return photo.exposure?.aperture;
    case "exposure-time":
      return photo.exposure?.exposureTime;
    case "iso":
      return photo.exposure?.iso;
    case "ev":
      return derived.exposureValue(
        photo.exposure?.aperture,
        photo.exposure?.exposureTime
      );
    case "lv":
      return derived.lightValue(
        photo.exposure?.aperture,
        photo.exposure?.exposureTime,
        photo.exposure?.iso
      );
    case "resolution":
      return derived.resolution(
        photo.dimensions?.original?.width,
        photo.dimensions?.original?.height
      );
    default:
      return undefined;
  }
};

export const matchesNumericRanges = (
  ranges: NumericRanges | undefined | null,
  photo: Photo
): boolean => {
  if (!ranges) return true;
  for (const category of Object.keys(ranges)) {
    const range = ranges[category];
    if (!range) continue;
    const { min, max } = range;
    if (min === undefined && max === undefined) continue;
    const value = numericValueFor(category, photo);
    if (value === undefined || value === null) return false;
    if (min !== undefined && value < min) return false;
    if (max !== undefined && value > max) return false;
  }
  return true;
};
