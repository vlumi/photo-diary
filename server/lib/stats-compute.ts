// Pure-function stats compute. Reused by both the gallery-scoped
// path (`models/stats.ts` → `POST /galleries/:id/stats`) and the
// cross-gallery path (`POST /stats`), since the only thing that
// changes between them is which photos the model passes in.
//
// No DB access, no cache. Tests can feed a `Photo[]` directly.
// Bucket keys are stringified derived values; the `<unknown>`
// bucket uses the literal string "unknown" to match the client's
// internal sentinel.

import type { Photo } from "../db/sqlite3/schema.js";
import * as derived from "./photo-derived.js";
import { matchesFilter, type FilterShape } from "./photo-filter-eval.js";

export const UNKNOWN_BUCKET = "unknown";

export type BucketCounts = Record<string, number>;
export interface YearMonthCounts {
  [year: string]: Record<string, number>;
}
export type PeakShape = "leader" | "tied" | "even";

export interface StatsSummary {
  first?: string;
  last?: string;
  spanDays: number;
  spanYears: number;
  spanMonths: number;
  peakShape: Record<string, PeakShape>;
  variety: Record<string, number>;
}

export interface StatsResponse {
  total: number;
  geotaggedCount: number;
  byCategory: Record<string, BucketCounts>;
  byYearMonth: YearMonthCounts;
  summary: StatsSummary;
  daysInYear: Record<string, number>;
  daysInYearMonth: YearMonthCounts;
  byStateCountry: Record<string, string>;
  byCityCountry: Record<string, string>;
  byCityLocalized: Record<string, string>;
  categoryValues: Record<string, string[]>;
  // Filtered photo counts per gallery — populated when the input
  // photos carry a `galleries: string[]` field (cross-gallery /
  // global stats). The `":orphan"` key counts photos linked to no
  // gallery. Absent (empty object) for single-gallery stats — that
  // scope is by definition one gallery, so the breakdown adds no
  // information.
  byGallery: BucketCounts;
}

const inc = (map: BucketCounts, key: string): void => {
  map[key] = (map[key] ?? 0) + 1;
};

const bucketByString = (
  photos: Photo[],
  deriver: (photo: Photo) => string | undefined
): BucketCounts => {
  const out: BucketCounts = {};
  for (const photo of photos) {
    const value = deriver(photo);
    inc(out, value ?? UNKNOWN_BUCKET);
  }
  return out;
};

const bucketByNumber = (
  photos: Photo[],
  deriver: (photo: Photo) => number | undefined
): BucketCounts => {
  const out: BucketCounts = {};
  for (const photo of photos) {
    const value = deriver(photo);
    inc(out, value === undefined ? UNKNOWN_BUCKET : String(value));
  }
  return out;
};

const formatCamera = (photo: Photo): string | undefined =>
  derived.formatGear(photo.camera?.make, photo.camera?.model);

const formatLens = (photo: Photo): string | undefined =>
  derived.formatGear(photo.lens?.make, photo.lens?.model);

const geocodedCityKey = (photo: Photo): string | undefined => {
  const cityEn = photo.geocoded?.cityEn ?? photo.geocoded?.city;
  if (!cityEn) return undefined;
  return JSON.stringify([
    photo.geocoded?.countryCode ?? "",
    photo.geocoded?.stateCode ?? "",
    cityEn,
  ]);
};

const cameraLensPairKey = (photo: Photo): string | undefined => {
  const camera = formatCamera(photo);
  const lens = formatLens(photo);
  if (!camera && !lens) return undefined;
  return JSON.stringify([camera ?? null, lens ?? null]);
};

const countDistinct = (
  photos: Photo[],
  deriver: (photo: Photo) => string | undefined
): number => {
  const set = new Set<string>();
  for (const photo of photos) {
    const value = deriver(photo);
    if (value) set.add(value);
  }
  return set.size;
};

// Peak-shape classifier. ≤1 leader within 1% of max → "leader";
// 2–3 within 1% → "tied"; ≥4 within 1% → "even".
const NEAR_TIE_THRESHOLD = 0.01;
const peakShape = (buckets: BucketCounts): PeakShape => {
  const values = Object.values(buckets);
  if (values.length === 0) return "leader";
  const max = Math.max(...values);
  if (max === 0) return "leader";
  const tied = values.filter((v) => (max - v) / max <= NEAR_TIE_THRESHOLD)
    .length;
  if (tied <= 1) return "leader";
  if (tied <= 3) return "tied";
  return "even";
};

const buildByYearMonth = (photos: Photo[]): YearMonthCounts => {
  const out: YearMonthCounts = {};
  for (const photo of photos) {
    const year = String(photo.taken.instant.year);
    const month = String(photo.taken.instant.month);
    if (!out[year]) out[year] = {};
    out[year][month] = (out[year][month] ?? 0) + 1;
  }
  return out;
};

const daysInCalendarYear = (year: number): number => {
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  return leap ? 366 : 365;
};
const daysInCalendarMonth = (year: number, month: number): number =>
  new Date(year, month, 0).getDate();

const buildDaysInYear = (photos: Photo[]): Record<string, number> => {
  const years = new Set<number>();
  for (const photo of photos) years.add(photo.taken.instant.year);
  const out: Record<string, number> = {};
  for (const year of years) out[String(year)] = daysInCalendarYear(year);
  return out;
};

const buildDaysInYearMonth = (photos: Photo[]): YearMonthCounts => {
  const seen = new Map<number, Set<number>>();
  for (const photo of photos) {
    const year = photo.taken.instant.year;
    const month = photo.taken.instant.month;
    if (!seen.has(year)) seen.set(year, new Set());
    seen.get(year)!.add(month);
  }
  const out: YearMonthCounts = {};
  for (const [year, months] of seen.entries()) {
    out[String(year)] = {};
    for (const month of months) {
      out[String(year)][String(month)] = daysInCalendarMonth(year, month);
    }
  }
  return out;
};

const compareTimestamps = (a: Photo, b: Photo): number =>
  a.taken.instant.timestamp.localeCompare(b.taken.instant.timestamp);

const formatDate = (photo: Photo): string => {
  const i = photo.taken.instant;
  return `${i.year}-${String(i.month).padStart(2, "0")}-${String(
    i.day
  ).padStart(2, "0")}`;
};

const computeSpan = (
  first: Photo | undefined,
  last: Photo | undefined
): { spanDays: number; spanYears: number; spanMonths: number } => {
  if (!first || !last) return { spanDays: 0, spanYears: 0, spanMonths: 0 };
  const firstDate = new Date(
    first.taken.instant.year,
    first.taken.instant.month - 1,
    first.taken.instant.day
  );
  const lastDate = new Date(
    last.taken.instant.year,
    last.taken.instant.month - 1,
    last.taken.instant.day
  );
  const ms = lastDate.getTime() - firstDate.getTime();
  const spanDays = Math.max(0, Math.round(ms / (24 * 60 * 60 * 1000)));
  const spanYears = Math.floor(spanDays / 365.25);
  const spanMonths = Math.floor(spanDays / (365.25 / 12));
  return { spanDays, spanYears, spanMonths };
};

const buildByCategory = (
  photos: Photo[]
): Record<string, BucketCounts> => ({
  author: bucketByString(photos, (p) => p.taken.author),
  country: bucketByString(photos, (p) => p.taken.location?.country),
  state: bucketByString(photos, (p) => p.geocoded?.stateCode),
  city: bucketByString(photos, geocodedCityKey),
  year: bucketByNumber(photos, (p) => p.taken.instant.year),
  month: bucketByNumber(photos, (p) => p.taken.instant.month),
  weekday: bucketByNumber(photos, (p) =>
    derived.weekday(
      p.taken.instant.year,
      p.taken.instant.month,
      p.taken.instant.day
    )
  ),
  hour: bucketByNumber(photos, (p) => p.taken.instant.hour),
  cameraMake: bucketByString(photos, (p) => p.camera?.make),
  camera: bucketByString(photos, formatCamera),
  lens: bucketByString(photos, formatLens),
  cameraLens: bucketByString(photos, cameraLensPairKey),
  focalLength: bucketByNumber(photos, (p) => p.exposure?.focalLength),
  focalLength35mmEquiv: bucketByNumber(photos, (p) =>
    derived.focalLength35mmEquiv(
      p.exposure?.focalLength,
      p.camera?.make,
      p.camera?.model,
      p.exposure?.focalLength35mmEquiv
    )
  ),
  aperture: bucketByNumber(photos, (p) => p.exposure?.aperture),
  exposureTime: bucketByNumber(photos, (p) => p.exposure?.exposureTime),
  iso: bucketByNumber(photos, (p) => p.exposure?.iso),
  ev: bucketByNumber(photos, (p) =>
    derived.exposureValue(p.exposure?.aperture, p.exposure?.exposureTime)
  ),
  lv: bucketByNumber(photos, (p) =>
    derived.lightValue(
      p.exposure?.aperture,
      p.exposure?.exposureTime,
      p.exposure?.iso
    )
  ),
  resolution: bucketByNumber(photos, (p) =>
    derived.resolution(
      p.dimensions?.original?.width,
      p.dimensions?.original?.height
    )
  ),
  orientation: bucketByString(photos, (p) =>
    derived.orientation(
      p.dimensions?.original?.width,
      p.dimensions?.original?.height
    )
  ),
  aspectRatio: bucketByString(photos, (p) =>
    derived.aspectRatio(
      p.dimensions?.original?.width,
      p.dimensions?.original?.height
    )
  ),
});

// Cumulative time series per bucket for the trend chart.
// Server hands the client a chart-ready shape: a sorted yearMonths
// X axis, plus per-bucket parallel arrays of monthly counts +
// running cumulative totals. weekday and hour are trendable too —
// year-by-year and month-by-month they show shooting-habit shifts
// (weekend → weekday, golden-hour → midday, etc.). year and month
// are still excluded since they ARE the time axis. State / city
// stay excluded as unreasonably high-cardinality.
export interface EvolutionResult {
  yearMonths: string[];
  buckets: Record<string, { counts: number[]; cumulative: number[] }>;
}
const EVOLUTION_BUCKETERS: Record<string, (p: Photo) => unknown> = {
  author: (p) => p.taken.author,
  country: (p) => p.taken.location?.country,
  weekday: (p) =>
    derived.weekday(
      p.taken.instant.year,
      p.taken.instant.month,
      p.taken.instant.day
    ),
  hour: (p) => p.taken.instant.hour,
  cameraMake: (p) => p.camera?.make,
  camera: formatCamera,
  lens: formatLens,
  cameraLens: cameraLensPairKey,
  focalLength: (p) => p.exposure?.focalLength,
  focalLength35mmEquiv: (p) =>
    derived.focalLength35mmEquiv(
      p.exposure?.focalLength,
      p.camera?.make,
      p.camera?.model,
      p.exposure?.focalLength35mmEquiv
    ),
  aperture: (p) => p.exposure?.aperture,
  exposureTime: (p) => p.exposure?.exposureTime,
  iso: (p) => p.exposure?.iso,
  ev: (p) =>
    derived.exposureValue(p.exposure?.aperture, p.exposure?.exposureTime),
  lv: (p) =>
    derived.lightValue(
      p.exposure?.aperture,
      p.exposure?.exposureTime,
      p.exposure?.iso
    ),
  resolution: (p) =>
    derived.resolution(
      p.dimensions?.original?.width,
      p.dimensions?.original?.height
    ),
  orientation: (p) =>
    derived.orientation(
      p.dimensions?.original?.width,
      p.dimensions?.original?.height
    ),
  aspectRatio: (p) =>
    derived.aspectRatio(
      p.dimensions?.original?.width,
      p.dimensions?.original?.height
    ),
};
export const EVOLUTION_CATEGORIES = Object.keys(EVOLUTION_BUCKETERS);
export const buildEvolution = (
  photos: Photo[],
  category: string,
  filter?: FilterShape
): EvolutionResult => {
  const getter = EVOLUTION_BUCKETERS[category];
  if (!getter) return { yearMonths: [], buckets: {} };
  const filtered = filter
    ? photos.filter((p) => matchesFilter(filter, p))
    : photos;
  // Discover the full year-month axis from the filtered set.
  const ymSet = new Set<string>();
  // Per-(bucket, ym) running count.
  const monthlyCounts: Record<string, Record<string, number>> = {};
  for (const photo of filtered) {
    const i = photo.taken.instant;
    const ym = `${i.year}-${String(i.month).padStart(2, "0")}`;
    ymSet.add(ym);
    const raw = getter(photo);
    const key =
      raw === undefined || raw === null || raw === ""
        ? UNKNOWN_BUCKET
        : String(raw);
    if (!monthlyCounts[key]) monthlyCounts[key] = {};
    monthlyCounts[key][ym] = (monthlyCounts[key][ym] ?? 0) + 1;
  }
  const yearMonths = [...ymSet].sort();
  const buckets: EvolutionResult["buckets"] = {};
  for (const [key, perMonth] of Object.entries(monthlyCounts)) {
    const counts: number[] = [];
    const cumulative: number[] = [];
    let running = 0;
    for (const ym of yearMonths) {
      const c = perMonth[ym] ?? 0;
      counts.push(c);
      running += c;
      cumulative.push(running);
    }
    buckets[key] = { counts, cumulative };
  }
  return { yearMonths, buckets };
};

export const buildAnnotations = (
  photos: Photo[]
): {
  byStateCountry: Record<string, string>;
  byCityCountry: Record<string, string>;
  byCityLocalized: Record<string, string>;
} => {
  const byStateCountry: Record<string, string> = {};
  const byCityCountry: Record<string, string> = {};
  const byCityLocalized: Record<string, string> = {};
  for (const photo of photos) {
    const country = photo.geocoded?.countryCode;
    const state = photo.geocoded?.stateCode;
    if (state && country && !byStateCountry[state]) {
      byStateCountry[state] = country;
    }
    const cityKey = geocodedCityKey(photo);
    if (cityKey && country && !byCityCountry[cityKey]) {
      byCityCountry[cityKey] = country;
    }
    if (cityKey && photo.geocoded?.city && !byCityLocalized[cityKey]) {
      byCityLocalized[cityKey] = photo.geocoded.city;
    }
  }
  return { byStateCountry, byCityCountry, byCityLocalized };
};

// Universe of bucket keys per category across the unfiltered set.
// Same buckets `buildByCategory` produces, collapsed to a sorted
// key list so the wire payload stays small.
export const buildCategoryValues = (
  photos: Photo[]
): Record<string, string[]> => {
  const all = buildByCategory(photos);
  const out: Record<string, string[]> = {};
  for (const [category, counts] of Object.entries(all)) {
    out[category] = Object.keys(counts).sort();
  }
  return out;
};

// Per-value photo counts per category. Drives the filter widget's
// top-N sort — operator sees the most-photographed values first
// without paying the cost of fetching the full /stats response just
// to pick filter values. Same buckets as `buildByCategory`, exposed
// as `{category: {key: count}}`.
export const buildCategoryCounts = (
  photos: Photo[]
): Record<string, Record<string, number>> => {
  const all = buildByCategory(photos);
  const out: Record<string, Record<string, number>> = {};
  for (const [category, counts] of Object.entries(all)) {
    out[category] = { ...counts };
  }
  return out;
};

export const computeStats = (
  photos: Photo[],
  filter?: FilterShape
): StatsResponse => {
  const filtered = filter
    ? photos.filter((p) => matchesFilter(filter, p))
    : photos;

  const byCategory = buildByCategory(filtered);
  const byYearMonth = buildByYearMonth(filtered);
  const annotations = buildAnnotations(filtered);
  // Universe always covers the input's full set so the filter UI
  // keeps surfacing every value, even when the active filter
  // narrows the count to zero for some of them.
  const categoryValues = buildCategoryValues(photos);

  const sorted = filtered.slice().sort(compareTimestamps);
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  const { spanDays, spanYears, spanMonths } = computeSpan(first, last);

  const summary: StatsSummary = {
    first: first ? formatDate(first) : undefined,
    last: last ? formatDate(last) : undefined,
    spanDays,
    spanYears,
    spanMonths,
    peakShape: {
      year: peakShape(byCategory.year),
      month: peakShape(byCategory.month),
      weekday: peakShape(byCategory.weekday),
      hour: peakShape(byCategory.hour),
      camera: peakShape(byCategory.camera),
      lens: peakShape(byCategory.lens),
      cameraLens: peakShape(byCategory.cameraLens),
    },
    variety: {
      author: countDistinct(filtered, (p) => p.taken.author),
      country: countDistinct(filtered, (p) => p.taken.location?.country),
      state: countDistinct(filtered, (p) => p.geocoded?.stateCode),
      city: countDistinct(filtered, geocodedCityKey),
      camera: countDistinct(filtered, formatCamera),
      lens: countDistinct(filtered, formatLens),
      cameraMake: countDistinct(filtered, (p) => p.camera?.make),
      cameraLens: countDistinct(filtered, cameraLensPairKey),
    },
  };

  // Count of filtered photos with usable coordinates. Drives the
  // Stats Location card's inline "N geotagged" so the card stays
  // populated even though the photo list itself fetches lazily
  // when the user opens the MapModal.
  let geotaggedCount = 0;
  for (const p of filtered) {
    if (
      typeof p.taken.location?.coordinates?.latitude === "number" &&
      typeof p.taken.location?.coordinates?.longitude === "number"
    ) {
      geotaggedCount++;
    }
  }
  // Per-gallery filtered counts for the Global Stats Galleries
  // section. Only meaningful when the input carries gallery
  // membership — global stats decorates each photo with the joined
  // `galleries` list before calling computeStats; gallery-scoped
  // stats doesn't, so byGallery comes out empty there.
  const byGallery: BucketCounts = {};
  for (const p of filtered) {
    const galleries = (p as Photo & { galleries?: string[] }).galleries;
    if (!Array.isArray(galleries)) continue;
    if (galleries.length === 0) {
      byGallery[":orphan"] = (byGallery[":orphan"] ?? 0) + 1;
      continue;
    }
    for (const galleryId of galleries) {
      byGallery[galleryId] = (byGallery[galleryId] ?? 0) + 1;
    }
  }
  return {
    total: filtered.length,
    geotaggedCount,
    byCategory,
    byYearMonth,
    summary,
    daysInYear: buildDaysInYear(filtered),
    daysInYearMonth: buildDaysInYearMonth(filtered),
    byStateCountry: annotations.byStateCountry,
    byCityCountry: annotations.byCityCountry,
    byCityLocalized: annotations.byCityLocalized,
    categoryValues,
    byGallery,
  };
};

export const isUnfilteredBase = (filter?: FilterShape): boolean => {
  if (!filter) return true;
  for (const topic of Object.keys(filter)) {
    const categories = filter[topic];
    if (!categories) continue;
    for (const category of Object.keys(categories)) {
      const keys = categories[category];
      if (Array.isArray(keys) && keys.length > 0) return false;
    }
  }
  return true;
};
