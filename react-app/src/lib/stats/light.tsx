/* eslint-disable @typescript-eslint/no-explicit-any */
import format from "../format";
import collection from "../collection";
import type { StatsContext } from "./context";
import { mean, stddev } from "./shared";

// The "light" topic of the statistics view. Bodies are bound to one
// `collectTopics` call through the context.
export const buildLightTopic = (context: StatsContext) => {
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

  return collectLight();
};
