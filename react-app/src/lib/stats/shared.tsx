/* eslint-disable @typescript-eslint/no-explicit-any */
// Types and small helpers shared by the stats topic builders.
import FlagIcon from "../../components/FlagIcon";
import type { Photo } from "../../models/PhotoModel";

export const mean = (values: number[]): number =>
  values.reduce((sum, v) => sum + v, 0) / values.length;

// Sample stddev (Bessel's correction); returns NaN for n < 2.
export const stddev = (values: number[]): number => {
  const m = mean(values);
  const variance =
    values.reduce((sum, v) => sum + (v - m) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
};


// Inline date-diff replacement (the npm package is unmaintained).
// Uses the same 365.25-day-year, 30.4375-day-month conventions.
export const MS_PER_DAY = 86400000;
export const MS_PER_YEAR = MS_PER_DAY * 365.25;
export const MS_PER_MONTH = MS_PER_YEAR / 12;
export const dateDiff = (a: Date, b: Date) => {
  const ms = a.getTime() - b.getTime();
  return {
    years: () => ms / MS_PER_YEAR,
    months: () => ms / MS_PER_MONTH,
    days: () => ms / MS_PER_DAY,
  };
};


export interface CountryData {
  getName(code: string, lang: string): string | undefined;
  isValid(code: string): boolean;
}
export interface Theme {
  get: (name: string) => string;
}

// Consumer-facing shapes for `collectTopics` and `uniqueValues`
// (internal aggregation carriers stay `any` — see file header).
export interface KpiItem {
  key: string;
  value: string;
}
export interface ChartSpec {
  type: "doughnut" | "polar" | "horizontal-bar" | "line";
  // chart.js's own types are deep; not worth re-authoring here.
  data: any;
  options: any;
}
// "value" is the category's natural sort (chronological, or
// ascending/descending by the bucketed value); "count" is top-by-count
// desc. Only `valueSortable` categories actually offer the toggle.
export type SortMode = "value" | "count";
export interface TableColumn {
  title: string;
  align: string;
  header?: boolean;
}
export interface TableRow {
  key: string;
  standardScore?: number;
  // Plain-text label for alphabetical sort. Only needed when the
  // display column is JSX (country carries a `<FlagIcon>` alongside
  // the name); string-column rows sort via `row[category.key]`.
  _label?: string;
  [columnKey: string]: unknown;
}
// Flattened union: summary categories carry `kpi`; data categories
// carry `charts`/`tableColumns`/`table`. Consumers guard on whichever
// fields they need.
export interface StatsCategory {
  key: string;
  title: string;
  // Discriminator for non-default render paths (e.g. the location card
  // hosts a map modal instead of the usual Summary/Charts/Table tile).
  kind?: "location";
  // `kind: "location"` carries its photo subset + counts; the modal
  // renders the map from these. `photos` is empty until the user
  // requests it via `onRequestPhotos` — the inline card shows
  // `geotaggedCount` from the stats response so no /query fires until
  // the modal opens. `onClosePhotos` fires when the user dismisses
  // the modal, letting the parent disable the query so subsequent
  // filter changes (with the modal still closed) don't refetch.
  photos?: Photo[];
  geotaggedCount?: number;
  totalCount?: number;
  onRequestPhotos?: () => void;
  onClosePhotos?: () => void;
  kpi?: KpiItem[];
  charts?: ChartSpec[];
  tableColumns?: TableColumn[];
  table?: TableRow[];
  summaryExtras?: SummaryExtras;
  // Offer the modal sort toggle ("By value" vs "Top"). "By value"
  // means: exposure → numeric, time → chronological, gear/people →
  // alphabetical (the alpha case needs `valueSortByLabel` below
  // because collectTopics pre-sorts gear/people by count-desc).
  valueSortable?: boolean;
  // "By value" re-sorts by display column label (alphabetical)
  // rather than trusting the natural order.
  valueSortByLabel?: boolean;
  // Inline card preserves the comparator's natural order instead of
  // re-sorting to count-desc. Set on the time categories so the
  // 10-row preview matches the chart's x-axis (chronological /
  // cyclical) — without it, year-month / year / month / weekday /
  // hour read inline as a top-N-by-count list that doesn't line up
  // with the line / polar chart above it.
  naturalInlineOrder?: boolean;
  // Skip the inline row cap for categories whose value set is finite
  // and small (month = 12, weekday = 7, hour = 24). A "+ N more…"
  // trailer on a bounded distribution reads as an arbitrary cut of a
  // list the reader already knows in full.
  inlineShowAll?: boolean;
}
// Expanded Summary view (SummaryModal). Four sub-trees:
// period (when), peaks (how concentrated), variety (how varied),
// mostUsed (which favorites).
export interface PeakEntry {
  key: string | number;
  value: number;
}
// Three peak shapes: clear leader, 2-3-way tie, or effectively
// flat (4+ values within ~1% of the max). The "even" case keeps
// daily-diary weekday/month distributions from getting a fake
// leader.
export type PeakShape =
  | { kind: "leader"; entries: PeakEntry[]; value: number }
  | { kind: "tied"; entries: PeakEntry[]; value: number }
  | { kind: "even"; value: number; count: number };
export interface SummaryPeriod {
  from?: { year: number; month: number; day: number };
  to?: { year: number; month: number; day: number };
  totalPhotos: number;
  totalDays: number;
  spanYears: number;
  spanMonths: number;
  averagePerDay: number;
}
export interface SummaryVariety {
  authors: number;
  countries: number;
  states: number;
  cities: number;
  cameras: number;
  lenses: number;
  cameraMakes: number;
  cameraLenses: number;
  focalLengths: number;
  apertures: number;
  exposureTimes: number;
  isos: number;
  years: number;
  yearMonths: number;
}
export interface SummaryExtras {
  period: SummaryPeriod;
  variety: SummaryVariety;
  peaks: {
    year: PeakShape;
    month: PeakShape;
    weekday: PeakShape;
    hour: PeakShape;
  };
  mostUsed: {
    author: PeakShape;
    country: PeakShape;
    state: PeakShape;
    city: PeakShape;
    camera: PeakShape;
    lens: PeakShape;
    cameraLens: PeakShape;
    focalLength: PeakShape;
    aperture: PeakShape;
    exposureTime: PeakShape;
    iso: PeakShape;
  };
}

// Bucket → peak shape. Empties filtered first so pre-allocated
// maps (byHour, byMonth) don't dilute the near-tied count.
export const detectPeakShape = (
  buckets: Record<string, number> | undefined
): PeakShape => {
  const entries = Object.entries(buckets ?? {})
    .map(([key, value]) => ({ key, value: Number(value) || 0 }))
    .filter((e) => e.value > 0)
    .sort((a, b) => b.value - a.value);
  if (entries.length === 0) {
    return { kind: "leader", entries: [], value: 0 };
  }
  const max = entries[0].value;
  const NEAR_TIE_THRESHOLD = 0.01;
  const tied = entries.filter(
    (e) => Math.abs(e.value - max) / max < NEAR_TIE_THRESHOLD
  );
  if (tied.length === 1) {
    return { kind: "leader", entries: tied, value: max };
  }
  if (tied.length <= 3) {
    return { kind: "tied", entries: tied, value: max };
  }
  const meanValue =
    entries.reduce((s, e) => s + e.value, 0) / entries.length;
  return { kind: "even", value: Math.round(meanValue), count: entries.length };
};
export const countDistinctNonZero = (
  buckets: Record<string, number> | undefined
): number =>
  Object.values(buckets ?? {}).filter((v) => Number(v) > 0).length;
export interface StatsTopic {
  key: string;
  title: string;
  categories: StatsCategory[];
}
export interface UniqueValueEntry {
  key: string | number;
  value: string;
  // Photo count for this value in the unfiltered gallery (or
  // the global set on GlobalStats). Drives the filter widget's
  // top-N sort. Optional so the StatsTable / other
  // consumers don't break if they pass entries without counts.
  count?: number;
}
// Indexed by topic → category → entries[{key, value}].
// Topics: general / time / gear / exposure. Categories: author /
// country / year / year-month / month / weekday / hour / camera-make /
// camera / lens / camera-lens / focal-length / aperture /
// exposure-time / iso / ev / lv / resolution / orientation /
// aspect-ratio.
export type UniqueValues = Record<string, Record<string, UniqueValueEntry[]>>;

export const UNKNOWN = "unknown";

export const decodeTableRowKey = (key: string | undefined): string | undefined => {
  if (!key) {
    return key;
  }
  const { value, isUnknown } = JSON.parse(key);
  if (isUnknown) return UNKNOWN;
  return value;
};

export interface BetaEnabled {
  regions?: boolean;
  focalLengthEquiv?: boolean;
}
