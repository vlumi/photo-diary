/* eslint-disable @typescript-eslint/no-explicit-any */
import format from "../format";
import collection from "../collection";
import type { StatsContext } from "./context";
import { mean, stddev } from "./shared";

// The "image" topic of the statistics view. Bodies are bound to one
// `collectTopics` call through the context.
export const buildImageTopic = (context: StatsContext) => {
  const {
    data,
    t,
    formatNumber,
    formatExposure,
    localizeUnknownKey,
    encodeTableKey,
    chartOptions,
    transformData,
    calculateStatistics,
  } = context;

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

  return collectImage();
};
