/* eslint-disable @typescript-eslint/no-explicit-any */
// This file aggregates photo statistics into chart-ready data and table rows.
// The internal accumulator shape is highly dynamic (year/month/day/category
// indexes built up from runtime data), so the internal helpers use `any` for
// the carrier objects; the public entry points (`generate`, `decodeTableRowKey`,
// `collectTopics`) are typed properly.
import React from "react";

const mean = (values: number[]): number =>
  values.reduce((sum, v) => sum + v, 0) / values.length;

// Sample stddev with Bessel's correction (divide by n - 1) — matches the previous
// mathjs default. Returns NaN for n < 2, same as mathjs.std.
const stddev = (values: number[]): number => {
  const m = mean(values);
  const variance =
    values.reduce((sum, v) => sum + (v - m) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
};
import type { TFunction } from "i18next";

import FlagIcon from "../components/FlagIcon";

// Small inline replacement for date-diff (unmaintained). Uses the same
// 365.25-day-year, 30.4375-day-month conventions that date-diff used.
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

// Public types describing the shape `collectTopics` returns and the
// shape `uniqueValues` flowing through Gallery / Filters / Stats components.
// The internal aggregation carriers stay `any` (see the file header comment);
// these are the consumer-facing shapes.
export interface KpiItem {
  key: string;
  value: string;
}
export interface ChartSpec {
  type: "doughnut" | "polar" | "horizontal-bar" | "line";
  // chart.js data and options stay `any` — chart.js's own types are deep and
  // we don't gain from authoring them here.
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
  [columnKey: string]: unknown;
}
// A single category bag: summary categories carry `kpi`; data categories
// (author/country/year/etc.) carry `charts`/`tableColumns`/`table`. The fields
// are optional because the union flattens through this single shape; consumers
// guard with `if (category.kpi)` / `if (category.charts)` etc.
export interface StatsCategory {
  key: string;
  title: string;
  kpi?: KpiItem[];
  charts?: ChartSpec[];
  tableColumns?: TableColumn[];
  table?: TableRow[];
  summaryExtras?: SummaryExtras;
  // Set on categories that should offer the modal sort toggle ("By
  // value" vs "Top"). What "By value" means depends on the category:
  //   - Exposure ranges: numeric ascending/descending (the natural
  //     sort already produced by collectTopics).
  //   - Time: chronological (year/month/weekday/hour calendar order).
  //   - Gear & people-or-place: alphabetical by display label — these
  //     pre-sort to count-desc in collectTopics, so the toggle has to
  //     do the re-sort itself; `valueSortByLabel` marks that case.
  valueSortable?: boolean;
  // True when the modal's "By value" mode should re-sort by display
  // label (alphabetical) instead of trusting the natural order. Set
  // for gear/people-or-place categories whose natural sort is by
  // count.
  valueSortByLabel?: boolean;
}
// Shapes for the expanded Summary view (see SummaryModal). Attached
// only to the `summary` category. The four sub-trees answer one
// question each: when (period), how peaked (peaks), how varied
// (variety), what favourites (mostUsed).
export interface PeakEntry {
  key: string | number;
  value: number;
}
// A peak distribution can have one clear leader, a small tie of 2-3,
// or be effectively flat (4+ values within ~1% of the max). The third
// case matters for evenly-distributed projects (e.g. a 365-style
// daily diary on weekdays/month-name) where faking a leader would be
// misleading.
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
    camera: PeakShape;
    lens: PeakShape;
    cameraLens: PeakShape;
    focalLength: PeakShape;
    aperture: PeakShape;
    exposureTime: PeakShape;
    iso: PeakShape;
  };
}

// Bucket → peak shape. Filters out zero-count entries first so a
// pre-allocated bucket map (byHour has all 24 keys, byMonth has all
// 12) doesn't drag down the "near-tied" count with empties.
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
}
// Indexed by topic → category. The values are nested arrays of {key, value}
// entries. Concrete topics include general/time/gear/exposure; concrete
// categories include author/country/year/year-month/month/weekday/hour/
// camera-make/camera/lens/camera-lens/focal-length/aperture/exposure-time/
// iso/ev/lv/resolution/orientation/aspect-ratio.
export type UniqueValues = Record<string, Record<string, UniqueValueEntry[]>>;

const UNKNOWN = "unknown";

const generate = async (
  photos: (Photo | undefined)[],
  uniqueValues: UniqueValues
) => {
  return collectStatistics(photos.filter((p): p is Photo => !!p), uniqueValues);
};

const decodeTableRowKey = (key: string | undefined): string | undefined => {
  if (!key) {
    return key;
  }
  const { value, isUnknown } = JSON.parse(key);
  if (isUnknown) return UNKNOWN;
  return value;
};

const collectTopics = (
  data: any,
  lang: string,
  t: TFunction,
  countryData: CountryData,
  theme: Theme
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
    const doMap = (data: any) => {
      const colorGradients = color.colorGradient(
        theme.get("header-background"),
        theme.get("header-color"),
        data.length
      );
      const colors = data
        .map((_: any) => Number(_.value))
        .map((value: any) => colorGradients[valueRanks[value]]);
      return [
        {
          labels: data
            .map(encodeLabelKey(formatter))
            .map((_: any) => JSON.stringify(_.key)),
          datasets: [
            {
              data: data.map((_: any) => _.value),
              backgroundColor: colors,
              borderWidth: 0.5,
              barThickness: "flex",
              minBarLength: 3,
              barPercentage: 1,
              categoryPercentage: 1,
            },
          ],
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
    otherLabel = t("stats-other"),
  }: {
    original: any;
    comparator?: any;
    formatter?: any;
    limit?: number;
    otherLabel?: any;
  }): any => {
    const flat = collection.foldToArray(original, comparator);
    const [data, valueRanks] = mapToChartData(
      flat,
      formatter,
      limit,
      otherLabel
    );
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
        format.countryName(lang, countryData)(countryCode),
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
                countryData
              )(localizeUnknownKey(entry.key))}
            </>
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
  const collectGeneral = () => {
    const count = data.count;
    const total = count.total;
    return {
      key: "general",
      title: t("stats-topic-general"),
      categories: [
        collectSummary(count),
        collectAuthor(count.byAuthor, total),
        collectCountry(count.byCountry, total),
      ],
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
      otherLabel: JSON.stringify([t("stats-other")]),
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
  const collectExposure = () => {
    const total = data.count.total;
    const byExposure = data.count.byExposure;
    return {
      key: "exposure",
      title: t("stats-topic-exposure"),
      categories: [
        collectFocalLength(byExposure.byFocalLength, total),
        collectAperture(byExposure.byAperture, total),
        collectExposureTime(byExposure.byExposureTime, total),
        collectIso(byExposure.byIso, total),
        collectExposureValue(byExposure.byExposureValue, total),
        collectLightValue(byExposure.byLightValue, total),
        collectResolution(byExposure.byResolution, total),
        collectOrientation(byExposure.byOrientation, total),
        collectAspectRatio(byExposure.byAspectRatio, total),
      ],
    };
  };

  const topics = [
    collectGeneral(),
    collectTime(),
    collectGear(),
    collectExposure(),
  ];
  // The internal carrier widens chart.type/table cell types to `string`/`any`;
  // the public StatsTopic shape narrows them back. Runtime values match.
  return topics as unknown as StatsTopic[];
};

export default { UNKNOWN, decodeTableRowKey, generate, collectTopics };

/**
 * Collect statistics from photos
 *
 * @param {array} photos The photos over which the statistics should be collected.
 * @param {object} uniqueValues
 * @param {string} UNKNOWN
 * @return Distribution statistics of the given photos over various parameters and their combinations.
 */
const collectStatistics = (photos: any, uniqueValues: any) => {
  const stats = initializeStats(uniqueValues);
  populateDistributions(photos, stats);
  return stats;
};

const initializeStats = (uniqueValues: any): any => {
  const stats: any = {
    count: {
      total: 0,
      byTime: {
        byYear: {},
        byYearMonth: {},
        byMonth: collection.objectFromArray(
          [...Array(12).keys()].map((month: any) => month + 1),
          0
        ),
        byWeekday: collection.objectFromArray([...Array(7).keys()], 0),
        byHour: collection.objectFromArray([...Array(24).keys()], 0),
        daysInYear: {},
        daysInYearMonth: {},
      },
      byExposure: {},
      byGear: {},
      byAuthor: {},
      byCountry: {},
    },
  };
  const setInitialValues = (source: any) => {
    if (!Array.isArray(source)) {
      return {};
    }
    return Object.fromEntries(source.map((_: any) => [_.key, 0]));
  };
  if (uniqueValues) {
    if ("general" in uniqueValues) {
      stats.count.byAuthor = setInitialValues(uniqueValues.general.author);
      stats.count.byCountry = setInitialValues(uniqueValues.general.country);
    }
    if ("time" in uniqueValues) {
      stats.count.byTime.byYearMonth = uniqueValues.time["year-month"]
        .map((_: any) => _.key.split("-"))
        .reduce((acc: any, v: any) => {
          acc[v[0]] = acc[v[0]] || {};
          acc[v[0]][v[1]] = 0;
          return acc;
        }, {});
      stats.count.byTime.byYear = setInitialValues(uniqueValues.time.year);
    }
    if ("gear" in uniqueValues) {
      stats.count.byGear.byCameraMake = setInitialValues(
        uniqueValues.gear["camera-make"]
      );
      stats.count.byGear.byCamera = setInitialValues(uniqueValues.gear.camera);
      stats.count.byGear.byLens = setInitialValues(uniqueValues.gear.lens);
      stats.count.byGear.byCameraLens = setInitialValues(
        uniqueValues.gear["camera-lens"].map((e: any) => {
          const key = JSON.parse(e.key);
          const camera = key[0] || UNKNOWN;
          const lens = key[1] || UNKNOWN;
          return { key: JSON.stringify([camera, lens]), value: e.value };
        })
      );
    }
    if ("exposure" in uniqueValues) {
      stats.count.byExposure.byFocalLength = setInitialValues(
        uniqueValues.exposure["focal-length"]
      );
      stats.count.byExposure.byAperture = setInitialValues(
        uniqueValues.exposure.aperture
      );
      stats.count.byExposure.byExposureTime = setInitialValues(
        uniqueValues.exposure["exposure-time"]
      );
      stats.count.byExposure.byIso = setInitialValues(
        uniqueValues.exposure.iso
      );
      stats.count.byExposure.byExposureValue = setInitialValues(
        uniqueValues.exposure.ev
      );
      stats.count.byExposure.byLightValue = setInitialValues(
        uniqueValues.exposure.lv
      );
      stats.count.byExposure.byResolution = setInitialValues(
        uniqueValues.exposure.resolution
      );
      stats.count.byExposure.byOrientation = setInitialValues(
        uniqueValues.exposure.orientation
      );
      stats.count.byExposure.byAspectRatio = setInitialValues(
        uniqueValues.exposure["aspect-ratio"]
      );
    }
  }
  return stats;
};

/**
 * Populate the statistical distribution of the photos by several parameters.
 *
 * @param {array} photos The photos over which the statistics should be collected.
 * @param {object} stats The target structure for collecting statistics.
 */
const populateDistributions = (photos: any, stats: any) => {
  photos.forEach((photo: any) => {
    stats.count.total++;

    const countryCode = photo.countryCode() || UNKNOWN;
    stats.count.byCountry[countryCode] =
      stats.count.byCountry[countryCode] || 0;
    stats.count.byCountry[countryCode]++;

    const author = photo.author() || UNKNOWN;
    stats.count.byAuthor[author] = stats.count.byAuthor[author] || 0;
    stats.count.byAuthor[author]++;

    updateTimeDistribution(
      stats.count.byTime,
      photo.year(),
      photo.month(),
      photo.day(),
      photo.weekday(),
      photo.hour()
    );
    const adjustExposure = () => {
      const focalLength =
        photo.focalLength() > 0 ? photo.focalLength() : UNKNOWN;
      const aperture = photo.aperture() || UNKNOWN;
      const exposureTime = photo.exposureTime() || UNKNOWN;
      const iso = photo.iso() || UNKNOWN;

      return {
        focalLength,
        aperture,
        exposureTime,
        iso,
      };
    };
    photo.exposure = adjustExposure();
    updateExposureDistribution(stats.count.byExposure, photo);
    updateGear(stats.count.byGear, photo);
  });
};

/**
 * Update the current photo's time values into the time distribution.
 *
 * The distribution is done in the following structure:
 *
 * - byYear[year]
 * - byYearMonth[year][month]
 * - byMonth[month]
 * - byWeekday[day]
 * - byHour[hour]
 * - years
 * - months
 * - days
 * - daysInYear[year]
 * - daysInYearMonth[year][month]
 *
 * @param {object} byTime Target for collecting the time distribution over all photos.
 * @param {number} year Photo timestamp year.
 * @param {number} month Photo timestamp month.
 * @param {number} day Photo timestamp day of month.
 * @param {number} hour Photo timestamp hour.
 */
const updateTimeDistribution = (
  byTime: any,
  year: number,
  month: number,
  day: number,
  weekday: number,
  hour: number | undefined
) => {
  const canonDate = (ymd: any) => ymd.year * 10000 + ymd.month * 100 + ymd.day;

  const canonYmd = canonDate({ year, month, day });
  const minDate = byTime.minDate || undefined;
  if (!minDate || canonYmd < canonDate(minDate)) {
    byTime.minDate = {
      year: year,
      month: month,
      day: day,
    };
  }
  const maxDate = byTime.maxDate || undefined;

  if (!maxDate || canonYmd > canonDate(byTime.maxDate)) {
    byTime.maxDate = {
      year: year,
      month: month,
      day: day,
    };
  }

  byTime.byYear[year] = byTime.byYear[year] || 0;
  byTime.byYear[year]++;

  byTime.byYearMonth[year] = byTime.byYearMonth[year] || {};
  byTime.byYearMonth[year][month] = byTime.byYearMonth[year][month] || 0;
  byTime.byYearMonth[year][month]++;

  byTime.byMonth[month] = byTime.byMonth[month] || 0;
  byTime.byMonth[month]++;

  byTime.byWeekday[weekday] = byTime.byWeekday[weekday] || 0;
  byTime.byWeekday[weekday]++;

  if (hour !== undefined) {
    byTime.byHour[hour] = byTime.byHour[hour] || 0;
    byTime.byHour[hour]++;
  }

  calculateNumberOfDays(byTime);
};
/**
 * Update the current photo's exposure values into the exposure distribution.
 *
 * The distribution is done in the following structure:
 *
 * - byFocalLength[focalLength]
 * - byAperture[aperture]
 * - byExposureTime[exposureTime]
 * - byIso[iso]
 * - byExposureValue[exposureValue]
 * - byLightValue[lightValue]
 *
 * @param {object} byExposure Target for collecting the exposure distribution over all photos.
 * @param {object} photo Exposure values of the current photo.
 */
const updateExposureDistribution = (byExposure: any, photo: any) => {
  const focalLength = Number(photo.focalLength()) || UNKNOWN;
  byExposure.byFocalLength = byExposure.byFocalLength || {};
  byExposure.byFocalLength[focalLength] =
    byExposure.byFocalLength[focalLength] || 0;
  byExposure.byFocalLength[focalLength]++;

  const aperture = Number(photo.aperture()) || UNKNOWN;
  byExposure.byAperture = byExposure.byAperture || {};
  byExposure.byAperture[aperture] = byExposure.byAperture[aperture] || 0;
  byExposure.byAperture[aperture]++;

  const exposureTime = Number(photo.exposureTime()) || UNKNOWN;
  byExposure.byExposureTime = byExposure.byExposureTime || {};
  byExposure.byExposureTime[exposureTime] =
    byExposure.byExposureTime[exposureTime] || 0;
  byExposure.byExposureTime[exposureTime]++;

  const iso = Number(photo.iso()) || UNKNOWN;
  byExposure.byIso = byExposure.byIso || {};
  byExposure.byIso[iso] = byExposure.byIso[iso] || 0;
  byExposure.byIso[iso]++;

  const exposureValue = Number(photo.exposureValue()) || UNKNOWN;
  byExposure.byExposureValue = byExposure.byExposureValue || {};
  byExposure.byExposureValue[exposureValue] =
    byExposure.byExposureValue[exposureValue] || 0;
  byExposure.byExposureValue[exposureValue]++;

  const lightValue = Number(photo.lightValue()) || UNKNOWN;
  byExposure.byLightValue = byExposure.byLightValue || {};
  byExposure.byLightValue[lightValue] =
    byExposure.byLightValue[lightValue] || 0;
  byExposure.byLightValue[lightValue]++;

  const resolution = Number(photo.resolution()) || UNKNOWN;
  byExposure.byResolution = byExposure.byResolution || {};
  byExposure.byResolution[resolution] =
    byExposure.byResolution[resolution] || 0;
  byExposure.byResolution[resolution]++;

  const orientation = photo.orientation() || UNKNOWN;
  byExposure.byOrientation = byExposure.byOrientation || {};
  byExposure.byOrientation[orientation] =
    byExposure.byOrientation[orientation] || 0;
  byExposure.byOrientation[orientation]++;

  const aspectRatio = photo.aspectRatio() || UNKNOWN;
  byExposure.byAspectRatio = byExposure.byAspectRatio || {};
  byExposure.byAspectRatio[aspectRatio] =
    byExposure.byAspectRatio[aspectRatio] || 0;
  byExposure.byAspectRatio[aspectRatio]++;
};
/**
 * Update the current photo's ger values into the gear (camera, lens) distribution.
 *
 * The distribution is done in the following structure:
 *
 * - byCamera
 *   - byTime
 *   - byExposure
 *   - byLens
 *     - byTime
 *     - byExposure
 * - byLens
 *   - byTime
 *   - byExposure
 *
 * @param {object} byGear Target for collecting the gear distribution over all photos.
 * @param {object} photo The current photo.
 */
const updateGear = (byGear: any, photo: any) => {
  const cameraMake = photo.cameraMake() || UNKNOWN;
  byGear.byCameraMake = byGear.byCameraMake || {};
  byGear.byCameraMake[cameraMake] = byGear.byCameraMake[cameraMake] || 0;
  byGear.byCameraMake[cameraMake]++;

  const camera = photo.formatCamera() || UNKNOWN;
  const lens = photo.formatLens() || UNKNOWN;
  byGear.byCamera = byGear.byCamera || {};
  byGear.byCamera[camera] = byGear.byCamera[camera] || 0;
  byGear.byCamera[camera]++;

  byGear.byLens = byGear.byLens || {};
  byGear.byLens[lens] = byGear.byLens[lens] || 0;
  byGear.byLens[lens]++;

  const cameraLens = JSON.stringify([camera, lens]);
  byGear.byCameraLens = byGear.byCameraLens || {};
  byGear.byCameraLens[cameraLens] = byGear.byCameraLens[cameraLens] || 0;
  byGear.byCameraLens[cameraLens]++;
};

/**
 * Calculate the number of days for the time distribution statistics, to allow calculating frequencies from the statistics.
 *
 * Produces the number of years, months, and days in the following structure:
 *
 * - years
 * - months
 * - days
 * - daysInYear[year]
 * - daysInYearMonth[year][month]
 *
 * @param {object} byTime Target for collecting the time distribution over all photos
 */
const calculateNumberOfDays = (byTime: any) => {
  const isLeap = (year: number) =>
    year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  // 1-indexed: a leading 0 lets month numbers (1–12) be used directly.
  const LEAP_MONTH_LENGTHS = [0, 31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  const COMMON_MONTH_LENGTHS = [
    0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31,
  ];
  const monthLengthsFor = (year: number) =>
    isLeap(year) ? LEAP_MONTH_LENGTHS : COMMON_MONTH_LENGTHS;

  const minYear = byTime.minDate.year;
  const maxYear = byTime.maxDate.year;
  byTime.daysInYear[minYear] = 0;
  byTime.daysInYearMonth[minYear] = {};

  const maxMonth = minYear === maxYear ? byTime.maxDate.month : 12;
  for (let m = byTime.minDate.month; m <= maxMonth; m++) {
    byTime.byYearMonth[minYear][m] = byTime.byYearMonth[minYear][m] || 0;
    if (minYear === maxYear && byTime.minDate.month === maxMonth) {
      byTime.daysInYear[minYear] += byTime.daysInYearMonth[minYear][m] =
        byTime.maxDate.day - byTime.minDate.day + 1;
    } else if (m === byTime.minDate.month) {
      byTime.daysInYear[minYear] += byTime.daysInYearMonth[minYear][m] =
        monthLengthsFor(minYear)[m] - byTime.minDate.day + 1;
    } else {
      byTime.daysInYear[minYear] += byTime.daysInYearMonth[minYear][m] =
        monthLengthsFor(minYear)[m];
    }
  }

  for (let y = minYear + 1; y < maxYear; y++) {
    const months = monthLengthsFor(y);
    byTime.byYear[y] = byTime.byYear[y] || 0;
    byTime.daysInYear[y] = isLeap(y) ? 366 : 365;

    byTime.byYearMonth[y] = byTime.byYearMonth[y] || {};
    byTime.daysInYearMonth[y] = {};
    for (let m = 1; m <= 12; m++) {
      byTime.byYearMonth[y][m] = byTime.byYearMonth[y][m] || 0;
      byTime.daysInYearMonth[y][m] = months[m];
    }
  }

  byTime.daysInYear[maxYear] = 0;
  byTime.daysInYearMonth[maxYear] = {};
  const minMonth = minYear === maxYear ? byTime.minDate.month : 1;
  for (let m = minMonth; m <= byTime.maxDate.month; m++) {
    byTime.byYearMonth[maxYear][m] = byTime.byYearMonth[maxYear][m] || 0;
    if (minYear === maxYear && minMonth === byTime.maxDate.month) {
      byTime.daysInYear[maxYear] += byTime.daysInYearMonth[maxYear][m] =
        byTime.maxDate.day - byTime.minDate.day + 1;
    } else if (m === byTime.maxDate.month) {
      byTime.daysInYear[maxYear] += byTime.daysInYearMonth[maxYear][m] =
        byTime.maxDate.day;
    } else {
      byTime.daysInYear[maxYear] += byTime.daysInYearMonth[maxYear][m] =
        monthLengthsFor(maxYear)[m];
    }
  }

  byTime.years = maxYear - minYear + 1;
  if (minYear === maxYear) {
    byTime.months = byTime.maxDate.month - byTime.minDate.month + 1;
  } else {
    byTime.months =
      (maxYear - minYear - 1) * 12 +
      13 -
      byTime.minDate.month +
      byTime.maxDate.month;
  }
  byTime.days = Object.values(byTime.daysInYear).reduce((a: any, b: any) => a + b, 0);
};
