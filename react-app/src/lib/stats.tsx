/* eslint-disable @typescript-eslint/no-explicit-any */
// Aggregates photo stats into chart data + table rows. Internal
// accumulators use `any` because their shape is built dynamically
// from runtime data; public entry points are properly typed.
import React from "react";

const mean = (values: number[]): number =>
  values.reduce((sum, v) => sum + v, 0) / values.length;

// Sample stddev (Bessel's correction); returns NaN for n < 2.
const stddev = (values: number[]): number => {
  const m = mean(values);
  const variance =
    values.reduce((sum, v) => sum + (v - m) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
};
import type { TFunction } from "i18next";

import FlagIcon from "../components/FlagIcon";

// Inline date-diff replacement (the npm package is unmaintained).
// Uses the same 365.25-day-year, 30.4375-day-month conventions.
const MS_PER_DAY = 86400000;
const MS_PER_YEAR = MS_PER_DAY * 365.25;
const MS_PER_MONTH = MS_PER_YEAR / 12;
const dateDiff = (a: Date, b: Date) => {
  const ms = a.getTime() - b.getTime();
  return {
    years: () => ms / MS_PER_YEAR,
    months: () => ms / MS_PER_MONTH,
    days: () => ms / MS_PER_DAY,
  };
};

import format from "./format";
import collection from "./collection";
import color from "./color";
import config from "./config";
import type { Photo } from "../models/PhotoModel";

interface CountryData {
  getName(code: string, lang: string): string | undefined;
  isValid(code: string): boolean;
}
interface Theme {
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
// mostUsed (which favourites).
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
const detectPeakShape = (
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
const countDistinctNonZero = (
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

const UNKNOWN = "unknown";

const decodeTableRowKey = (key: string | undefined): string | undefined => {
  if (!key) {
    return key;
  }
  const { value, isUnknown } = JSON.parse(key);
  if (isUnknown) return UNKNOWN;
  return value;
};

interface BetaEnabled {
  regions?: boolean;
  focalLengthEquiv?: boolean;
}

const collectTopics = (
  data: any,
  lang: string,
  t: TFunction,
  countryData: CountryData,
  theme: Theme,
  mapPhotos: Photo[] = [],
  hideMap = false,
  betaEnabled: BetaEnabled = {},
  onRequestMapPhotos?: () => void,
  onCloseMapPhotos?: () => void
): StatsTopic[] => {
  const formatNumber = format.number(lang);
  const formatExposure = format.exposure(lang, t);

  const localizeUnknownKey = (
    key: string,
    unknownLabel: string = String(t("stats-unknown"))
  ): string => {
    try {
      return JSON.stringify(
        JSON.parse(key).map((part: any) => (part === UNKNOWN ? unknownLabel : part))
      );
    } catch (e) {
      return key === UNKNOWN ? unknownLabel : key;
    }
  };
  const encodeTableKey = (value: any) =>
    JSON.stringify({
      value: value,
      isUnknown: value === UNKNOWN,
    });
  const encodeLabelKey = (formatter: any) => (entry: any) =>
    collection.transformObjectValue(entry, "key", (entry: any) => {
      return {
        name: formatter(localizeUnknownKey(entry.key)),
        share: format.share(entry.value, data.count.total),
      };
    });
  const decodeLabelKey = (key: any, value: any) => {
    try {
      const { name, share } = JSON.parse(key);
      if (name !== undefined && share !== undefined) {
        return ` ${name}: ${formatNumber.default(
          value
        )} (${formatNumber.oneDecimal(share)}%)`;
      }
    } catch (e) {
      // OK
    }
    return ` ${key}: ${formatNumber.default(value)}`;
  };
  const chartOptions: any = {
    common: {
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          mode: "index",
          callbacks: {
            title: () => "",
            label: (context: any) => {
              return decodeLabelKey(
                context.dataset.label || context.label,
                context.dataset.data[context.dataIndex]
              );
            },
          },
        },
      },
      animation: false,
      responsive: true,
      maintainAspectRatio: false,
    },
  };
  Object.assign(chartOptions, {
    doughnut: {
      ...chartOptions.common,
      cutout: 0,
    },
    polar: {
      ...chartOptions.common,
      scales: {
        r: {
          ticks: {
            display: false,
          },
        },
      },
    },
    bar: {
      ...chartOptions.common,
      indexAxis: "y",
      scales: {
        x: {
          display: false,
        },
        y: {
          display: false,
        },
      },
    },
    line: {
      ...chartOptions.common,
      scales: {
        y: {
          stacked: true,
        },
      },
      // pointRadius: 0 on the year/month datasets hides the per-
      // month dots but also kills hover hit-testing under the default
      // `intersect: true`. `intersect: false` lets the index-mode
      // tooltip trigger on column position alone.
      interaction: {
        mode: "index",
        intersect: false,
      },
    },
  });

  const mapToChartData = (
    foldedData: any,
    formatter: any = format.identity,
    maxEntries = 0,
    otherLabel: any = t("stats-other")
  ): any => {
    const valueRanks = collection.calculateRanks(foldedData, (_: any) =>
      Number(_.value)
    );
    const truncated =
      maxEntries > 0 && foldedData && foldedData.length > maxEntries;
    const doMap = (data: any) => {
      // Color rank is computed on the truncated data so "Other" gets
      // a gradient slot proportional to its aggregated value (instead
      // of falling out of `valueRanks` and rendering as undefined).
      // The original `valueRanks` is still returned for the table's
      // overall-rank column.
      const colorRanks = collection.calculateRanks(data, (_: any) =>
        Number(_.value)
      );
      const colorGradients = color.colorGradient(
        theme.get("header-background"),
        theme.get("header-color"),
        data.length
      );
      const colors = data
        .map((_: any) => Number(_.value))
        .map((value: any) => colorGradients[colorRanks[value]]);
      return [
        {
          labels: data
            .map(encodeLabelKey(formatter))
            .map((_: any) => JSON.stringify(_.key)),
          datasets: [
            {
              data: data.map((_: any) => _.value),
              backgroundColor: colors,
              // Hairline in --primary-color keeps every band visible
              // even when its fill happens to land near the chart
              // background ( — gradient endpoints can otherwise
              // blend into white / off-white surrounds on neutral
              // themes).
              borderColor: theme.get("primary-color"),
              borderWidth: 0.5,
              barThickness: "flex",
              minBarLength: 3,
              barPercentage: 1,
              categoryPercentage: 1,
            },
          ],
          _otherIndex: truncated ? data.length - 1 : undefined,
        },
        valueRanks,
      ];
    };
    return collection.truncateAndProcess(
      foldedData,
      maxEntries,
      doMap,
      (data: any) => {
        return {
          key: otherLabel,
          value: data.map((_: any) => _.value).reduce((a: any, b: any) => a + b, 0),
        };
      }
    );
  };
  const transformData = ({
    original,
    comparator = collection.numSortByFieldDesc("value"),
    formatter = format.identity,
    limit = 0,
    otherLabel,
  }: {
    original: any;
    comparator?: any;
    formatter?: any;
    limit?: number;
    otherLabel?: any;
  }): any => {
    const label =
      otherLabel ??
      (limit > 0
        ? t("stats-other-beyond", { n: limit + 1 })
        : t("stats-other"));
    const flat = collection.foldToArray(original, comparator);
    const [data, valueRanks] = mapToChartData(
      flat,
      formatter,
      limit,
      label
    );
    // Stash an unlimited variant for the modal's by-value mode —
    // aggregating the long tail under "Other (N+)" makes the chart
    // readable when sorted by count, but obscures the actual values
    // when the user explicitly asks for "By value".
    if (limit > 0 && flat.length > limit) {
      const [fullData] = mapToChartData(flat, formatter, 0, label);
      (data as { _fullData?: unknown })._fullData = fullData;
    }
    return [flat, data, valueRanks];
  };
  const calculateStatistics = (values: any) => {
    if (values.length === 0) {
      return { mean: 0, stddev: 0 };
    }
    return { mean: mean(values), stddev: stddev(values) };
  };
  const collectSummary = (count: any) => {
    const getTimeDiff = (count: any) => {
      if (count.byTime.days < 1) {
        const now = new Date();
        return dateDiff(now, now);
      }
      const minDate = new Date(
        count.byTime.minDate.year,
        count.byTime.minDate.month - 1,
        count.byTime.minDate.day
      );
      const maxDate = new Date(
        count.byTime.maxDate.year,
        count.byTime.maxDate.month - 1,
        count.byTime.maxDate.day + 1 // Offset by one to make the difference inclusive
      );
      return dateDiff(maxDate, minDate);
    };
    const diff = getTimeDiff(count);
    const byTime = count.byTime || {};
    const byGear = count.byGear || {};
    const byExposure = count.byExposure || {};
    const yearMonthsDistinct = Object.values(
      (byTime.byYearMonth ?? {}) as Record<string, Record<string, number>>
    ).reduce(
      (acc, monthMap) => acc + countDistinctNonZero(monthMap),
      0
    );
    const summaryExtras: SummaryExtras = {
      period: {
        from: byTime.minDate,
        to: byTime.maxDate,
        totalPhotos: count.total,
        totalDays: byTime.days || 0,
        spanYears: diff.years(),
        spanMonths: diff.months(),
        averagePerDay: count.total / (byTime.days || 1),
      },
      variety: {
        authors: countDistinctNonZero(count.byAuthor),
        countries: countDistinctNonZero(count.byCountry),
        states: countDistinctNonZero(count.byState),
        cities: countDistinctNonZero(count.byCity),
        cameras: countDistinctNonZero(byGear.byCamera),
        lenses: countDistinctNonZero(byGear.byLens),
        cameraMakes: countDistinctNonZero(byGear.byCameraMake),
        cameraLenses: countDistinctNonZero(byGear.byCameraLens),
        focalLengths: countDistinctNonZero(byExposure.byFocalLength),
        apertures: countDistinctNonZero(byExposure.byAperture),
        exposureTimes: countDistinctNonZero(byExposure.byExposureTime),
        isos: countDistinctNonZero(byExposure.byIso),
        years: countDistinctNonZero(byTime.byYear),
        yearMonths: yearMonthsDistinct,
      },
      peaks: {
        year: detectPeakShape(byTime.byYear),
        month: detectPeakShape(byTime.byMonth),
        weekday: detectPeakShape(byTime.byWeekday),
        hour: detectPeakShape(byTime.byHour),
      },
      mostUsed: {
        author: detectPeakShape(count.byAuthor),
        country: detectPeakShape(count.byCountry),
        state: detectPeakShape(count.byState),
        city: detectPeakShape(count.byCity),
        camera: detectPeakShape(byGear.byCamera),
        lens: detectPeakShape(byGear.byLens),
        cameraLens: detectPeakShape(byGear.byCameraLens),
        focalLength: detectPeakShape(byExposure.byFocalLength),
        aperture: detectPeakShape(byExposure.byAperture),
        exposureTime: detectPeakShape(byExposure.byExposureTime),
        iso: detectPeakShape(byExposure.byIso),
      },
    };
    return {
      key: "summary",
      title: t("stats-category-summary"),
      kpi: collection.foldToArray({
        photos: formatNumber.default(count.total),
        average: formatNumber.twoDecimal(
          count.total / (count.byTime.days || 1)
        ),
        years: formatNumber.oneDecimal(diff.years()),
        months: formatNumber.oneDecimal(diff.months()),
        days: formatNumber.default(diff.days()),
      }),
      summaryExtras,
    };
  };
  const collectAuthor = (byAuthor: any, total: any) => {
    const [flat, data, valueRanks] = transformData({
      original: byAuthor,
    });
    const values = flat.map((entry: any) => entry.value);
    const { mean, stddev } = calculateStatistics(values);
    return {
      key: "author",
      title: t("stats-category-author"),
      valueSortable: true,
      valueSortByLabel: true,
      charts: [
        { type: "doughnut", data, options: chartOptions.doughnut },
        { type: "horizontal-bar", data, options: chartOptions.bar },
      ],
      tableColumns: [
        { title: "rank", align: "right", header: true },
        { title: "author", align: "left" },
        { title: "count", align: "right" },
        { title: "share", align: "right" },
      ],
      table: flat.map((entry: any) => {
        return {
          key: encodeTableKey(entry.key),
          rank: formatNumber.default(valueRanks[entry.value] + 1),
          author: localizeUnknownKey(entry.key),
          count: formatNumber.default(entry.value),
          share: `${formatNumber.oneDecimal(
            format.share(entry.value, total)
          )}%`,
          _count: entry.value,
          standardScore: (entry.value - mean) / stddev,
        };
      }),
    };
  };
  const collectCountry = (byCountry: any, total: any) => {
    const [flat, data, valueRanks] = transformData({
      original: byCountry,
      formatter: (countryCode: any) =>
        format.countryName(lang, countryData, t)(countryCode),
    });
    const values = flat.map((entry: any) => entry.value);
    const { mean, stddev } = calculateStatistics(values);
    return {
      key: "country",
      title: t("stats-category-country"),
      valueSortable: true,
      valueSortByLabel: true,
      charts: [
        { type: "doughnut", data, options: chartOptions.doughnut },
        { type: "horizontal-bar", data, options: chartOptions.bar },
      ],
      tableColumns: [
        { title: "rank", align: "right", header: true },
        { title: "flag", align: "right", header: true },
        { title: "country", align: "left" },
        { title: "count", align: "right" },
        { title: "share", align: "right" },
      ],
      table: flat.map((entry: any) => {
        return {
          key: encodeTableKey(entry.key),
          rank: formatNumber.default(valueRanks[entry.value] + 1),
          flag: (
            <>
              {countryData.isValid(entry.key) ? (
                <FlagIcon code={entry.key} />
              ) : (
                <></>
              )}
            </>
          ),
          country: (
            <>
              {format.countryName(
                lang,
                countryData,
                t
              )(localizeUnknownKey(entry.key))}
            </>
          ),
          count: formatNumber.default(entry.value),
          share: `${formatNumber.oneDecimal(
            format.share(entry.value, total)
          )}%`,
          _count: entry.value,
          _label: format.countryName(
            lang,
            countryData,
            t
          )(localizeUnknownKey(entry.key)),
          standardScore: (entry.value - mean) / stddev,
        };
      }),
    };
  };
  const collectState = (byState: any, byStateCountry: any, total: any) => {
    const [flat, data, valueRanks] = transformData({
      original: byState,
      formatter: (code: any) => format.subdivisionName(lang, code),
      limit: 20,
    });
    const values = flat.map((entry: any) => entry.value);
    const { mean, stddev } = calculateStatistics(values);
    return {
      key: "state",
      title: t("stats-category-state"),
      valueSortable: true,
      valueSortByLabel: true,
      charts: [
        { type: "doughnut", data, options: chartOptions.doughnut },
        { type: "horizontal-bar", data, options: chartOptions.bar },
      ],
      tableColumns: [
        { title: "rank", align: "right", header: true },
        { title: "flag", align: "right", header: true },
        { title: "state", align: "left" },
        { title: "count", align: "right" },
        { title: "share", align: "right" },
      ],
      table: flat.map((entry: any) => {
        const countryCode = byStateCountry?.[entry.key];
        const label =
          entry.key === UNKNOWN
            ? String(t("stats-unknown"))
            : format.subdivisionName(lang, entry.key);
        return {
          key: encodeTableKey(entry.key),
          rank: formatNumber.default(valueRanks[entry.value] + 1),
          flag: (
            <>
              {countryCode && countryData.isValid(countryCode) ? (
                <FlagIcon code={countryCode} />
              ) : (
                <></>
              )}
            </>
          ),
          state: label,
          count: formatNumber.default(entry.value),
          share: `${formatNumber.oneDecimal(
            format.share(entry.value, total)
          )}%`,
          _count: entry.value,
          _label: label,
          standardScore: (entry.value - mean) / stddev,
        };
      }),
    };
  };
  const collectCity = (
    byCity: any,
    byCityCountry: any,
    byCityLocalized: any,
    total: any
  ) => {
    const cityLabels = format.buildCityLabels(
      Object.keys(byCity),
      lang,
      format.countryName(lang, countryData, t),
      byCityLocalized
    );
    const fallbackLabel = (key: string): string => {
      const parsed = format.parseCityKey(key);
      return byCityLocalized?.[key] ?? parsed.city;
    };
    const [flat, data, valueRanks] = transformData({
      original: byCity,
      formatter: (key: any) => cityLabels[key] ?? fallbackLabel(key),
      limit: 20,
    });
    const values = flat.map((entry: any) => entry.value);
    const { mean, stddev } = calculateStatistics(values);
    return {
      key: "city",
      title: t("stats-category-city"),
      valueSortable: true,
      valueSortByLabel: true,
      charts: [
        { type: "doughnut", data, options: chartOptions.doughnut },
        { type: "horizontal-bar", data, options: chartOptions.bar },
      ],
      tableColumns: [
        { title: "rank", align: "right", header: true },
        { title: "flag", align: "right", header: true },
        { title: "city", align: "left" },
        { title: "count", align: "right" },
        { title: "share", align: "right" },
      ],
      table: flat.map((entry: any) => {
        const countryCode = byCityCountry?.[entry.key];
        const label =
          entry.key === UNKNOWN
            ? String(t("stats-unknown"))
            : cityLabels[entry.key] ?? fallbackLabel(entry.key);
        return {
          key: encodeTableKey(entry.key),
          rank: formatNumber.default(valueRanks[entry.value] + 1),
          flag: (
            <>
              {countryCode && countryData.isValid(countryCode) ? (
                <FlagIcon code={countryCode} />
              ) : (
                <></>
              )}
            </>
          ),
          city: label,
          count: formatNumber.default(entry.value),
          share: `${formatNumber.oneDecimal(
            format.share(entry.value, total)
          )}%`,
          _count: entry.value,
          _label: label,
          standardScore: (entry.value - mean) / stddev,
        };
      }),
    };
  };
  const collectLocation = (
    photos: Photo[],
    geotaggedCount: number,
    total: number
  ): StatsCategory => ({
    key: "location",
    title: t("stats-category-location"),
    kind: "location",
    photos,
    geotaggedCount,
    totalCount: total,
    onRequestPhotos: onRequestMapPhotos,
    onClosePhotos: onCloseMapPhotos,
  });
  const collectGeneral = () => {
    const count = data.count;
    const total = count.total;
    const categories: any[] = [
      collectSummary(count),
      collectAuthor(count.byAuthor, total),
    ];
    // hide_map suppresses country and location categories (both
    // location-derived). mapPhotos is already empty when hideMap.
    if (!hideMap) {
      categories.push(collectCountry(count.byCountry, total));
      if (betaEnabled.regions && Object.keys(count.byState ?? {}).length > 0) {
        categories.push(
          collectState(count.byState, count.byStateCountry, total)
        );
      }
      if (Object.keys(count.byCity ?? {}).length > 0) {
        categories.push(
          collectCity(
            count.byCity,
            count.byCityCountry,
            count.byCityLocalized,
            total
          )
        );
      }
      // Location card surfaces whenever the server reports any
      // geotagged photos; the photo list itself is lazy —
      // the inline card shows the count, the MapModal fetches
      // pins on open via `onRequestPhotos`.
      const geotaggedCount = count.geotaggedCount ?? 0;
      if (geotaggedCount > 0) {
        categories.push(collectLocation(mapPhotos, geotaggedCount, total));
      }
    }
    return {
      key: "general",
      title: t("stats-topic-general"),
      categories,
    };
  };

  const collectYearMonth = (byYearMonth: any, daysInYearMonth: any) => {
    const mapToChartData = (deep: any) => {
      if (!deep || !deep.length) {
        return {
          labels: [],
          datasets: [],
        };
      }
      const colorGradients = color.colorGradient(
        theme.get("header-background"),
        theme.get("header-color"),
        deep.length
      );
      return {
        labels: [...Array(12).keys()].map((entry: any) =>
          t(`month-long-${entry + 1}`)
        ),
        datasets: deep.map((entry: any, i: any) => {
          return {
            label: entry.key,
            backgroundColor: colorGradients[i],
            // Hairline in --primary-color keeps the band edge visible
            // when the fill lands near the chart background.
            borderColor: theme.get("primary-color"),
            borderWidth: 0.5,
            // Suppress the per-month point markers — they read as
            // noise against the band borders. Hover still flashes a
            // small point so the tooltip association is clear.
            pointRadius: 0,
            pointHoverRadius: 3,
            data: [...Array(12).keys()].map((month: any) => entry.value[month + 1]),
            fill: true,
            lineTension: 0.4,
          };
        }),
      };
    };
    const deep = Object.keys(byYearMonth)
      .sort((a: any, b: any) => a - b)
      .map((year: any) => {
        return {
          key: year,
          value: byYearMonth[year],
        };
      });
    const data = mapToChartData(deep);
    const flat = deep
      .sort((a: any, b: any) => Number(b.key) - Number(a.key))
      .flatMap((year: any) => {
        return [...Array(12).keys()]
          .sort((a: any, b: any) => b - a)
          .filter((month: any) => `${month + 1}` in year.value)
          .map((month: any) => {
            return {
              key: [year.key, month + 1],
              value: year.value[month + 1],
            };
          });
      });
    const average = (value: any, year: any, month: any) => {
      if (
        !(year in daysInYearMonth) ||
        !(month in daysInYearMonth[year]) ||
        !daysInYearMonth[year][month]
      ) {
        return 0;
      }
      return value / daysInYearMonth[year][month];
    };
    const values = flat.map((entry: any) => {
      const [year, month] = entry.key;
      return average(entry.value, year, month);
    });
    const { mean, stddev } = calculateStatistics(values);
    const valueRanks = collection.calculateRanks(flat, (_: any) => Number(_.value));
    return {
      key: "year-month",
      title: t("stats-category-year-month"),
      valueSortable: true,
      naturalInlineOrder: true,
      charts: [{ type: "line", data, options: chartOptions.line }],
      tableColumns: [
        { title: "rank", align: "right", header: true },
        { title: "year-month", align: "left" },
        { title: "count", align: "right" },
        { title: "average", align: "right" },
      ],
      table: flat.map((entry: any) => {
        const [year, month] = entry.key;
        return {
          key: encodeTableKey(entry.key.join("-")),
          rank: formatNumber.default(valueRanks[entry.value] + 1),
          "year-month": t("stats-year-month", {
            year,
            month: t(`month-long-${month}`),
          }),
          count: formatNumber.default(entry.value),
          average: formatNumber.twoDecimal(average(entry.value, year, month)),
          _count: entry.value,
          standardScore: (average(entry.value, year, month) - mean) / stddev,
        };
      }),
    };
  };
  const collectYear = (byYear: any, daysInYear: any) => {
    const [flat, data, valueRanks] = transformData({
      original: byYear,
      comparator: collection.numSortByFieldDesc("key"),
    });
    const values = flat.map((entry: any) => {
      return entry.value / daysInYear[entry.key];
    });
    const { mean, stddev } = calculateStatistics(values);
    return {
      key: "year",
      title: t("stats-category-year"),
      valueSortable: true,
      naturalInlineOrder: true,
      charts: [
        { type: "doughnut", data, options: chartOptions.doughnut },
        { type: "horizontal-bar", data, options: chartOptions.bar },
      ],
      tableColumns: [
        { title: "rank", align: "right", header: true },
        { title: "year", align: "left" },
        { title: "count", align: "right" },
        { title: "average", align: "right" },
      ],
      table: flat.map((entry: any) => {
        return {
          key: encodeTableKey(entry.key),
          rank: formatNumber.default(valueRanks[entry.value] + 1),
          year: entry.key,
          count: formatNumber.default(entry.value),
          average: t("stats-per-day", {
            count: formatNumber.twoDecimal(entry.value / daysInYear[entry.key]),
          }),
          _count: entry.value,
          standardScore: (entry.value / daysInYear[entry.key] - mean) / stddev,
        };
      }),
    };
  };
  const collectMonth = (byMonth: any, total: any) => {
    const [flat, data, valueRanks] = transformData({
      original: byMonth,
      comparator: collection.numSortByFieldAsc("key"),
      formatter: (month: any) => t(`month-long-${month}`),
      limit: 12,
    });
    const values = flat.map((entry: any) => entry.value);
    const { mean, stddev } = calculateStatistics(values);
    return {
      key: "month",
      title: t("stats-category-month"),
      valueSortable: true,
      naturalInlineOrder: true,
      inlineShowAll: true,
      charts: [
        { type: "polar", data, options: chartOptions.polar },
        { type: "horizontal-bar", data, options: chartOptions.bar },
      ],
      tableColumns: [
        { title: "rank", align: "right", header: true },
        { title: "month", align: "left" },
        { title: "count", align: "right" },
        { title: "share", align: "right" },
      ],
      table: flat.map((entry: any) => {
        return {
          key: encodeTableKey(entry.key),
          rank: formatNumber.default(valueRanks[entry.value] + 1),
          month: t(`month-long-${entry.key}`),
          count: formatNumber.default(entry.value),
          share: `${formatNumber.oneDecimal(
            format.share(entry.value, total)
          )}%`,
          _count: entry.value,
          standardScore: (entry.value - mean) / stddev,
        };
      }),
    };
  };
  const collectWeekday = (byWeekday: any, total: any) => {
    const [flat, data, valueRanks] = transformData({
      original: collection.transformObjectKeys(byWeekday, (dow: any, value: any) => {
        const key = dow < config.FIRST_WEEKDAY ? Number(dow) + 7 : dow;
        return [key, value];
      }),
      comparator: collection.numSortByFieldAsc("key"),
      formatter: (dow: any) => t(`weekday-long-${format.dayOfWeek(dow)}`),
      limit: 24,
    });
    const values = flat.map((entry: any) => entry.value);
    const { mean, stddev } = calculateStatistics(values);
    return {
      key: "weekday",
      title: t("stats-category-weekday"),
      valueSortable: true,
      naturalInlineOrder: true,
      inlineShowAll: true,
      charts: [
        { type: "polar", data, options: chartOptions.polar },
        { type: "horizontal-bar", data, options: chartOptions.bar },
      ],
      tableColumns: [
        { title: "rank", align: "right", header: true },
        { title: "weekday", align: "left" },
        { title: "count", align: "right" },
        { title: "share", align: "right" },
      ],
      table: flat.map((entry: any) => {
        return {
          key: encodeTableKey(entry.key),
          rank: formatNumber.default(valueRanks[entry.value] + 1),
          weekday: t(`weekday-long-${format.dayOfWeek(entry.key)}`),
          count: formatNumber.default(entry.value),
          share: `${formatNumber.oneDecimal(
            format.share(entry.value, total)
          )}%`,
          _count: entry.value,
          standardScore: (entry.value - mean) / stddev,
        };
      }),
    };
  };
  const collectHour = (byHour: any, total: any) => {
    const [flat, data, valueRanks] = transformData({
      original: byHour,
      comparator: collection.numSortByFieldAsc("key"),
      formatter: (hour: any) => `${format.padNumber(hour, 2)}:00–`,
      limit: 24,
    });
    const values = flat.map((entry: any) => entry.value);
    const { mean, stddev } = calculateStatistics(values);
    return {
      key: "hour",
      title: t("stats-category-hour"),
      valueSortable: true,
      naturalInlineOrder: true,
      inlineShowAll: true,
      charts: [
        { type: "polar", data, options: chartOptions.polar },
        { type: "horizontal-bar", data, options: chartOptions.bar },
      ],
      tableColumns: [
        { title: "rank", align: "right", header: true },
        { title: "hour", align: "left" },
        { title: "count", align: "right" },
        { title: "share", align: "right" },
      ],
      table: flat.map((entry: any) => {
        return {
          key: encodeTableKey(entry.key),
          rank: formatNumber.default(valueRanks[entry.value] + 1),
          hour: `${format.padNumber(entry.key, 2)}:00–`,
          count: formatNumber.default(entry.value),
          share: `${formatNumber.oneDecimal(
            format.share(entry.value, total)
          )}%`,
          _count: entry.value,
          standardScore: (entry.value - mean) / stddev,
        };
      }),
    };
  };
  const collectTime = () => {
    const total = data.count.total;
    const byTime = data.count.byTime;
    return {
      key: "time",
      title: t("stats-topic-time"),
      categories: [
        collectYearMonth(byTime.byYearMonth, byTime.daysInYearMonth),
        collectYear(byTime.byYear, byTime.daysInYear),
        collectMonth(byTime.byMonth, total),
        collectWeekday(byTime.byWeekday, total),
        collectHour(byTime.byHour, total),
      ],
    };
  };

  const collectCameraMake = (byCameraMake: any, total: any) => {
    const [flat, data, valueRanks] = transformData({
      original: byCameraMake,
      limit: 20,
    });
    const values = flat.map((entry: any) => entry.value);
    const { mean, stddev } = calculateStatistics(values);
    return {
      key: "camera-make",
      title: t("stats-category-camera-make"),
      valueSortable: true,
      valueSortByLabel: true,
      charts: [
        { type: "doughnut", data, options: chartOptions.doughnut },
        { type: "horizontal-bar", data, options: chartOptions.bar },
      ],
      tableColumns: [
        { title: "rank", align: "right", header: true },
        { title: "camera-make", align: "left" },
        { title: "count", align: "right" },
        { title: "share", align: "right" },
      ],
      table: flat.map((entry: any) => {
        return {
          key: encodeTableKey(entry.key),
          rank: formatNumber.default(valueRanks[entry.value] + 1),
          "camera-make": localizeUnknownKey(entry.key),
          count: formatNumber.default(entry.value),
          share: `${formatNumber.oneDecimal(
            format.share(entry.value, total)
          )}%`,
          _count: entry.value,
          standardScore: (entry.value - mean) / stddev,
        };
      }),
    };
  };
  const collectCamera = (byCamera: any, total: any) => {
    const [flat, data, valueRanks] = transformData({
      original: byCamera,
      limit: 20,
    });
    const values = flat.map((entry: any) => entry.value);
    const { mean, stddev } = calculateStatistics(values);
    return {
      key: "camera",
      title: t("stats-category-camera"),
      valueSortable: true,
      valueSortByLabel: true,
      charts: [
        { type: "doughnut", data, options: chartOptions.doughnut },
        { type: "horizontal-bar", data, options: chartOptions.bar },
      ],
      tableColumns: [
        { title: "rank", align: "right", header: true },
        { title: "camera", align: "left" },
        { title: "count", align: "right" },
        { title: "share", align: "right" },
      ],
      table: flat.map((entry: any) => {
        return {
          key: encodeTableKey(entry.key),
          rank: formatNumber.default(valueRanks[entry.value] + 1),
          camera: localizeUnknownKey(entry.key),
          count: formatNumber.default(entry.value),
          share: `${formatNumber.oneDecimal(
            format.share(entry.value, total)
          )}%`,
          _count: entry.value,
          standardScore: (entry.value - mean) / stddev,
        };
      }),
    };
  };
  const collectLens = (byLens: any, total: any) => {
    const [flat, data, valueRanks] = transformData({
      original: byLens,
      limit: 20,
    });
    const values = flat.map((entry: any) => entry.value);
    const { mean, stddev } = calculateStatistics(values);
    return {
      key: "lens",
      title: t("stats-category-lens"),
      valueSortable: true,
      valueSortByLabel: true,
      charts: [
        { type: "doughnut", data, options: chartOptions.doughnut },
        { type: "horizontal-bar", data, options: chartOptions.bar },
      ],
      tableColumns: [
        { title: "rank", align: "right", header: true },
        { title: "lens", align: "left" },
        { title: "count", align: "right" },
        { title: "share", align: "right" },
      ],
      table: flat.map((entry: any) => {
        return {
          key: encodeTableKey(entry.key),
          rank: formatNumber.default(valueRanks[entry.value] + 1),
          lens: localizeUnknownKey(entry.key),
          count: formatNumber.default(entry.value),
          share: `${formatNumber.oneDecimal(
            format.share(entry.value, total)
          )}%`,
          _count: entry.value,
          standardScore: (entry.value - mean) / stddev,
        };
      }),
    };
  };
  const collectCameraLens = (byCameraLens: any, total: any) => {
    const [flat, data, valueRanks] = transformData({
      original: byCameraLens,
      formatter: (cameraLens: any) => JSON.parse(cameraLens).join(" + "),
      limit: 20,
      otherLabel: JSON.stringify([t("stats-other-beyond", { n: 21 })]),
    });
    const values = flat.map((entry: any) => entry.value);
    const { mean, stddev } = calculateStatistics(values);
    return {
      key: "camera-lens",
      title: t("stats-category-camera-lens"),
      valueSortable: true,
      valueSortByLabel: true,
      charts: [
        { type: "doughnut", data, options: chartOptions.doughnut },
        { type: "horizontal-bar", data, options: chartOptions.bar },
      ],
      tableColumns: [
        { title: "rank", align: "right", header: true },
        { title: "camera-lens", align: "left" },
        { title: "count", align: "right" },
        { title: "share", align: "right" },
      ],
      table: flat.map((entry: any) => {
        return {
          key: encodeTableKey(entry.key),
          rank: formatNumber.default(valueRanks[entry.value] + 1),
          "camera-lens": JSON.parse(localizeUnknownKey(entry.key)).join(" + "),
          count: formatNumber.default(entry.value),
          share: `${formatNumber.oneDecimal(
            format.share(entry.value, total)
          )}%`,
          _count: entry.value,
          standardScore: (entry.value - mean) / stddev,
        };
      }),
    };
  };
  const collectGear = () => {
    const total = data.count.total;
    const byGear = data.count.byGear;
    return {
      key: "gear",
      title: t("stats-topic-gear"),
      categories: [
        collectCameraMake(byGear.byCameraMake, total),
        collectCamera(byGear.byCamera, total),
        collectLens(byGear.byLens, total),
        collectCameraLens(byGear.byCameraLens, total),
      ],
    };
  };

  const collectFocalLength = (byFocalLength: any, total: any) => {
    const [flat, data, valueRanks] = transformData({
      original: byFocalLength,
      formatter: formatExposure.focalLength,
      comparator: collection.numSortByFieldAsc("key"),
    });
    const values = flat.map((entry: any) => entry.value);
    const { mean, stddev } = calculateStatistics(values);
    return {
      key: "focal-length",
      title: t("stats-category-focal-length"),
      valueSortable: true,
      charts: [
        { type: "doughnut", data, options: chartOptions.doughnut },
        { type: "horizontal-bar", data, options: chartOptions.bar },
      ],
      tableColumns: [
        { title: "rank", align: "right", header: true },
        { title: "focal-length", align: "left" },
        { title: "count", align: "right" },
        { title: "share", align: "right" },
      ],
      table: flat.map((entry: any) => {
        return {
          key: encodeTableKey(entry.key),
          rank: formatNumber.default(valueRanks[entry.value] + 1),
          "focal-length": formatExposure.focalLength(
            localizeUnknownKey(entry.key) as any
          ),
          count: formatNumber.default(entry.value),
          share: `${formatNumber.oneDecimal(
            format.share(entry.value, total)
          )}%`,
          _count: entry.value,
          standardScore: (entry.value - mean) / stddev,
        };
      }),
    };
  };
  const collectFocalLength35mmEquiv = (
    byFocalLength35mmEquiv: any,
    total: any
  ) => {
    const [flat, data, valueRanks] = transformData({
      original: byFocalLength35mmEquiv,
      formatter: formatExposure.focalLength,
      comparator: collection.numSortByFieldAsc("key"),
    });
    const values = flat.map((entry: any) => entry.value);
    const { mean, stddev } = calculateStatistics(values);
    return {
      key: "focal-length-eq",
      title: t("stats-category-focal-length-eq"),
      valueSortable: true,
      charts: [
        { type: "doughnut", data, options: chartOptions.doughnut },
        { type: "horizontal-bar", data, options: chartOptions.bar },
      ],
      tableColumns: [
        { title: "rank", align: "right", header: true },
        { title: "focal-length-eq", align: "left" },
        { title: "count", align: "right" },
        { title: "share", align: "right" },
      ],
      table: flat.map((entry: any) => {
        return {
          key: encodeTableKey(entry.key),
          rank: formatNumber.default(valueRanks[entry.value] + 1),
          "focal-length-eq": formatExposure.focalLength(
            localizeUnknownKey(entry.key) as any
          ),
          count: formatNumber.default(entry.value),
          share: `${formatNumber.oneDecimal(
            format.share(entry.value, total)
          )}%`,
          _count: entry.value,
          standardScore: (entry.value - mean) / stddev,
        };
      }),
    };
  };
  const collectAperture = (byAperture: any, total: any) => {
    const [flat, data, valueRanks] = transformData({
      original: byAperture,
      formatter: formatExposure.aperture,
      comparator: collection.numSortByFieldAsc("key"),
    });
    const values = flat.map((entry: any) => entry.value);
    const { mean, stddev } = calculateStatistics(values);
    return {
      key: "aperture",
      title: t("stats-category-aperture"),
      valueSortable: true,
      charts: [
        { type: "doughnut", data, options: chartOptions.doughnut },
        { type: "horizontal-bar", data, options: chartOptions.bar },
      ],
      tableColumns: [
        { title: "rank", align: "right", header: true },
        { title: "aperture", align: "left" },
        { title: "count", align: "right" },
        { title: "share", align: "right" },
      ],
      table: flat.map((entry: any) => {
        return {
          key: encodeTableKey(entry.key),
          rank: formatNumber.default(valueRanks[entry.value] + 1),
          aperture: formatExposure.aperture(localizeUnknownKey(entry.key) as any),
          count: formatNumber.default(entry.value),
          share: `${formatNumber.oneDecimal(
            format.share(entry.value, total)
          )}%`,
          _count: entry.value,
          standardScore: (entry.value - mean) / stddev,
        };
      }),
    };
  };
  const collectExposureTime = (byExposureTime: any, total: any) => {
    const [flat, data, valueRanks] = transformData({
      original: byExposureTime,
      formatter: formatExposure.exposureTime,
      comparator: collection.numSortByFieldDesc("key"),
    });
    const values = flat.map((entry: any) => entry.value);
    const { mean, stddev } = calculateStatistics(values);
    return {
      key: "exposure-time",
      title: t("stats-category-exposure-time"),
      valueSortable: true,
      charts: [
        { type: "doughnut", data, options: chartOptions.doughnut },
        { type: "horizontal-bar", data, options: chartOptions.bar },
      ],
      tableColumns: [
        { title: "rank", align: "right", header: true },
        { title: "exposure-time", align: "left" },
        { title: "count", align: "right" },
        { title: "share", align: "right" },
      ],
      table: flat.map((entry: any) => {
        return {
          key: encodeTableKey(entry.key),
          rank: formatNumber.default(valueRanks[entry.value] + 1),
          "exposure-time": formatExposure.exposureTime(
            localizeUnknownKey(entry.key) as any
          ),
          count: formatNumber.default(entry.value),
          share: `${formatNumber.oneDecimal(
            format.share(entry.value, total)
          )}%`,
          _count: entry.value,
          standardScore: (entry.value - mean) / stddev,
        };
      }),
    };
  };
  const collectIso = (byIso: any, total: any) => {
    const [flat, data, valueRanks] = transformData({
      original: byIso,
      formatter: formatExposure.iso,
      comparator: collection.numSortByFieldAsc("key"),
    });
    const values = flat.map((entry: any) => entry.value);
    const { mean, stddev } = calculateStatistics(values);
    return {
      key: "iso",
      title: t("stats-category-iso"),
      valueSortable: true,
      charts: [
        { type: "doughnut", data, options: chartOptions.doughnut },
        { type: "horizontal-bar", data, options: chartOptions.bar },
      ],
      tableColumns: [
        { title: "rank", align: "right", header: true },
        { title: "iso", align: "left" },
        { title: "count", align: "right" },
        { title: "share", align: "right" },
      ],
      table: flat.map((entry: any) => {
        return {
          key: encodeTableKey(entry.key),
          rank: formatNumber.default(valueRanks[entry.value] + 1),
          iso: formatExposure.iso(localizeUnknownKey(entry.key) as any),
          count: formatNumber.default(entry.value),
          share: `${formatNumber.oneDecimal(
            format.share(entry.value, total)
          )}%`,
          _count: entry.value,
          standardScore: (entry.value - mean) / stddev,
        };
      }),
    };
  };
  const collectExposureValue = (byExposureValue: any, total: any) => {
    const [flat, data, valueRanks] = transformData({
      original: byExposureValue,
      formatter: formatExposure.ev,
      comparator: collection.numSortByFieldAsc("key"),
    });
    const values = flat.map((entry: any) => entry.value);
    const { mean, stddev } = calculateStatistics(values);
    return {
      key: "ev",
      title: t("stats-category-ev"),
      valueSortable: true,
      charts: [
        { type: "doughnut", data, options: chartOptions.doughnut },
        { type: "horizontal-bar", data, options: chartOptions.bar },
      ],
      tableColumns: [
        { title: "rank", align: "right", header: true },
        { title: "ev", align: "left" },
        { title: "count", align: "right" },
        { title: "share", align: "right" },
      ],
      table: flat.map((entry: any) => {
        return {
          key: encodeTableKey(entry.key),
          rank: formatNumber.default(valueRanks[entry.value] + 1),
          ev: formatExposure.ev(localizeUnknownKey(entry.key) as any),
          count: formatNumber.default(entry.value),
          share: `${formatNumber.oneDecimal(
            format.share(entry.value, total)
          )}%`,
          _count: entry.value,
          standardScore: (entry.value - mean) / stddev,
        };
      }),
    };
  };
  const collectLightValue = (byLightValue: any, total: any) => {
    const [flat, data, valueRanks] = transformData({
      original: byLightValue,
      formatter: formatExposure.ev,
      comparator: collection.numSortByFieldAsc("key"),
    });
    const values = flat.map((entry: any) => entry.value);
    const { mean, stddev } = calculateStatistics(values);
    return {
      key: "lv",
      title: t("stats-category-lv"),
      valueSortable: true,
      charts: [
        { type: "doughnut", data, options: chartOptions.doughnut },
        { type: "horizontal-bar", data, options: chartOptions.bar },
      ],
      tableColumns: [
        { title: "rank", align: "right", header: true },
        { title: "lv", align: "left" },
        { title: "count", align: "right" },
        { title: "share", align: "right" },
      ],
      table: flat.map((entry: any) => {
        return {
          key: encodeTableKey(entry.key),
          rank: formatNumber.default(valueRanks[entry.value] + 1),
          lv: formatExposure.ev(localizeUnknownKey(entry.key) as any),
          count: formatNumber.default(entry.value),
          share: `${formatNumber.oneDecimal(
            format.share(entry.value, total)
          )}%`,
          _count: entry.value,
          standardScore: (entry.value - mean) / stddev,
        };
      }),
    };
  };
  const collectResolution = (byResolution: any, total: any) => {
    const [flat, data, valueRanks] = transformData({
      original: byResolution,
      formatter: formatExposure.resolution,
      comparator: collection.numSortByFieldAsc("key"),
    });
    const values = flat.map((entry: any) => entry.value);
    const { mean, stddev } = calculateStatistics(values);
    return {
      key: "resolution",
      title: t("stats-category-resolution"),
      valueSortable: true,
      charts: [
        { type: "doughnut", data, options: chartOptions.doughnut },
        { type: "horizontal-bar", data, options: chartOptions.bar },
      ],
      tableColumns: [
        { title: "rank", align: "right", header: true },
        { title: "resolution", align: "left" },
        { title: "count", align: "right" },
        { title: "share", align: "right" },
      ],
      table: flat.map((entry: any) => {
        return {
          key: encodeTableKey(entry.key),
          rank: formatNumber.default(valueRanks[entry.value] + 1),
          resolution: formatExposure.resolution(localizeUnknownKey(entry.key) as any),
          count: formatNumber.default(entry.value),
          share: `${formatNumber.oneDecimal(
            format.share(entry.value, total)
          )}%`,
          _count: entry.value,
          standardScore: (entry.value - mean) / stddev,
        };
      }),
    };
  };
  const collectOrientation = (byOrientation: any, total: any) => {
    const [flat, data, valueRanks] = transformData({
      original: byOrientation,
      formatter: formatExposure.orientation,
    });
    const values = flat.map((entry: any) => entry.value);
    const { mean, stddev } = calculateStatistics(values);
    return {
      key: "orientation",
      title: t("stats-category-orientation"),
      charts: [
        { type: "doughnut", data, options: chartOptions.doughnut },
        { type: "horizontal-bar", data, options: chartOptions.bar },
      ],
      tableColumns: [
        { title: "rank", align: "right", header: true },
        { title: "orientation", align: "left" },
        { title: "count", align: "right" },
        { title: "share", align: "right" },
      ],
      table: flat.map((entry: any) => {
        return {
          key: encodeTableKey(entry.key),
          rank: formatNumber.default(valueRanks[entry.value] + 1),
          orientation: t(`stats-orientation-${entry.key}`),
          count: formatNumber.default(entry.value),
          share: `${formatNumber.oneDecimal(
            format.share(entry.value, total)
          )}%`,
          _count: entry.value,
          standardScore: (entry.value - mean) / stddev,
        };
      }),
    };
  };
  const collectAspectRatio = (byAspectRatio: any, total: any) => {
    const [flat, data, valueRanks] = transformData({
      original: byAspectRatio
    });
    const values = flat.map((entry: any) => entry.value);
    const { mean, stddev } = calculateStatistics(values);
    return {
      key: "aspect-ratio",
      title: t("stats-category-aspect-ratio"),
      charts: [
        { type: "doughnut", data, options: chartOptions.doughnut },
        { type: "horizontal-bar", data, options: chartOptions.bar },
      ],
      tableColumns: [
        { title: "rank", align: "right", header: true },
        { title: "aspect-ratio", align: "left" },
        { title: "count", align: "right" },
        { title: "share", align: "right" },
      ],
      table: flat.map((entry: any) => {
        return {
          key: encodeTableKey(entry.key),
          rank: formatNumber.default(valueRanks[entry.value] + 1),
          "aspect-ratio": formatExposure.aspectRatio(entry.key),
          count: formatNumber.default(entry.value),
          share: `${formatNumber.oneDecimal(
            format.share(entry.value, total)
          )}%`,
          _count: entry.value,
          standardScore: (entry.value - mean) / stddev,
        };
      }),
    };
  };
  const collectSettings = () => {
    const total = data.count.total;
    const byExposure = data.count.byExposure;
    const categories: any[] = [
      collectFocalLength(byExposure.byFocalLength, total),
    ];
    if (betaEnabled.focalLengthEquiv) {
      categories.push(
        collectFocalLength35mmEquiv(
          byExposure.byFocalLength35mmEquiv,
          total
        )
      );
    }
    categories.push(
      collectAperture(byExposure.byAperture, total),
      collectExposureTime(byExposure.byExposureTime, total),
      collectIso(byExposure.byIso, total)
    );
    return {
      key: "settings",
      title: t("stats-topic-settings"),
      categories,
    };
  };
  const collectImage = () => {
    const total = data.count.total;
    const byExposure = data.count.byExposure;
    return {
      key: "image",
      title: t("stats-topic-image"),
      categories: [
        collectResolution(byExposure.byResolution, total),
        collectAspectRatio(byExposure.byAspectRatio, total),
        collectOrientation(byExposure.byOrientation, total),
      ],
    };
  };
  const collectLight = () => {
    const total = data.count.total;
    const byExposure = data.count.byExposure;
    return {
      key: "light",
      title: t("stats-topic-light"),
      categories: [
        collectExposureValue(byExposure.byExposureValue, total),
        collectLightValue(byExposure.byLightValue, total),
      ],
    };
  };

  const topics = [
    collectGeneral(),
    collectTime(),
    collectGear(),
    collectSettings(),
    collectImage(),
    collectLight(),
  ];
  // Internal carriers widen chart.type/table cells; runtime matches.
  return topics as unknown as StatsTopic[];
};

export default { UNKNOWN, decodeTableRowKey, collectTopics };

