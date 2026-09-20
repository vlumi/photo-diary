/* eslint-disable @typescript-eslint/no-explicit-any */
import format from "../format";
import collection from "../collection";
import type { StatsContext } from "./context";
import { mean, stddev } from "./shared";

// The "settings" topic of the statistics view. Bodies are bound to one
// `collectTopics` call through the context.
export const buildSettingsTopic = (context: StatsContext) => {
  const {
    data,
    t,
    betaEnabled,
    formatNumber,
    formatExposure,
    localizeUnknownKey,
    encodeTableKey,
    chartOptions,
    transformData,
    calculateStatistics,
  } = context;

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

  return collectSettings();
};
