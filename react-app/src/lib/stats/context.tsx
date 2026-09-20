/* eslint-disable @typescript-eslint/no-explicit-any */
// What every topic builder needs: the inputs of one `collectTopics`
// call, and the formatting and chart-shaping helpers bound to them.
import format from "../format";
import collection from "../collection";
import color from "../color";
import type { TFunction } from "i18next";

import type { Photo } from "../../models/PhotoModel";
import {
  BetaEnabled,
  CountryData,
  mean,
  stddev,
  Theme,
  UNKNOWN,
} from "./shared";

export const createStatsContext = (
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
) => {
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
    // Cap the color gradient at `min(20, top-95%-by-share)` visible
    // bands. Spreading the gradient across every bucket makes
    // dominating slices share near-identical mid-gradient colors
    // (visible on 80+ distinct focal lengths); capping at 20 fixes
    // the flat-tail case but still wastes half the gradient on
    // near-invisible slices when the distribution is top-heavy
    // (e.g. aperture where the top 3 already sum to 89%). The
    // share-based cap picks up that case — everything past the 95%
    // cumulative mark collapses to the endpoint color.
    const COLOR_TOP_N = 20;
    const COLOR_SHARE_THRESHOLD = 0.95;
    const doMap = (data: any) => {
      // Color rank is computed on the truncated data so "Other" gets
      // a gradient slot proportional to its aggregated value (instead
      // of falling out of `valueRanks` and rendering as undefined).
      // The original `valueRanks` is still returned for the table's
      // overall-rank column.
      const colorRanks = collection.calculateRanks(data, (_: any) =>
        Number(_.value)
      );
      const sortedCounts = data
        .map((_: any) => Number(_.value))
        .sort((a: number, b: number) => b - a);
      const total = sortedCounts.reduce((s: number, v: number) => s + v, 0);
      // How many top slices are needed to reach the share threshold.
      // At least 1 so the color assignment stays well-defined even
      // for zero-total or single-bucket data.
      let shareWindow = 1;
      if (total > 0) {
        let cumulative = 0;
        for (let i = 0; i < sortedCounts.length; i++) {
          cumulative += sortedCounts[i];
          if (cumulative / total >= COLOR_SHARE_THRESHOLD) {
            shareWindow = i + 1;
            break;
          }
        }
      }
      const windowSize = Math.min(data.length, COLOR_TOP_N, shareWindow);
      const gradientSteps = Math.max(1, windowSize);
      const colorGradients = color.colorGradient(
        theme.get("header-background"),
        theme.get("header-color"),
        gradientSteps
      );
      // colorRanks is descending: rank 0 = largest slice. The
      // uncapped mapping used `colorGradients[rank]` so rank 0 got
      // the start-color and the tail got the end-color. Preserve
      // that direction for the top-N and clamp everything past N to
      // the end-color (last gradient index) — visually identical to
      // "smallest-slice color" from the reader's perspective.
      const tailIndex = gradientSteps - 1;
      const colors = data
        .map((_: any) => Number(_.value))
        .map((value: any) => {
          const rank = colorRanks[value];
          return rank < windowSize
            ? colorGradients[rank]
            : colorGradients[tailIndex];
        });
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

  return {
    data,
    lang,
    t,
    countryData,
    theme,
    mapPhotos,
    hideMap,
    betaEnabled,
    onRequestMapPhotos,
    onCloseMapPhotos,
    formatNumber,
    formatExposure,
    localizeUnknownKey,
    encodeTableKey,
    encodeLabelKey,
    decodeLabelKey,
    chartOptions,
    mapToChartData,
    transformData,
    calculateStatistics,
  };
};

export type StatsContext = ReturnType<typeof createStatsContext>;
