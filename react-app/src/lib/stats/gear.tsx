/* eslint-disable @typescript-eslint/no-explicit-any */
import format from "../format";
import type { StatsContext } from "./context";
import { mean, stddev, UNKNOWN } from "./shared";

// The "gear" topic of the statistics view. Bodies are bound to one
// `collectTopics` call through the context.
export const buildGearTopic = (context: StatsContext) => {
  const {
    data,
    t,
    formatNumber,
    localizeUnknownKey,
    encodeTableKey,
    chartOptions,
    transformData,
    calculateStatistics,
  } = context;

  const collectCameraMake = (byCameraMake: any, total: any) => {
    const [flat, data, valueRanks] = transformData({
      original: byCameraMake,
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
    // Server-side pair key is JSON `[camera, lens]` where a missing
    // half is `null`. Localize null → "Unknown" (or the unknown
    // string bucket that server-side `localizeUnknownKey` already
    // handles) so a null lens doesn't render as trailing whitespace
    // after the " + " separator.
    const unknownLabel = String(t("stats-unknown"));
    const formatPair = (raw: string): string =>
      JSON.parse(raw)
        .map((part: unknown) =>
          part === null || part === UNKNOWN ? unknownLabel : String(part)
        )
        .join(" + ");
    const [flat, data, valueRanks] = transformData({
      original: byCameraLens,
      formatter: formatPair,
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
          "camera-lens": formatPair(entry.key),
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

  return collectGear();
};
