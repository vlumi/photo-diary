import React from "react";

import { create, all } from "mathjs";

import FlagIcon from "../components/FlagIcon";

import format from "./format";
import collection from "./collection";
import color from "./color";
import config from "./config";

const math = create(all, {});

const UNKNOWN = "unknown";

const generate = async (photos, unknownLabel) => {
  return collectStatistics(photos, unknownLabel);
};

const decodeTableRowKey = (key) => {
  if (!key) {
    return key;
  }
  const { value, isUnknown } = JSON.parse(key);
  if (isUnknown) return UNKNOWN;
  return value;
};

const collectTopics = (data, lang, t, countryData) => {
  const formatNumber = format.number(lang);
  const formatExposure = format.exposure(lang);

  const unknownLabel = t("stats-unknown");
  const encodeTableKey = (value) =>
    JSON.stringify({
      value: value,
      isUnknown: value === unknownLabel,
    });

  const encodeLabelKey = (formatter) => (entry) =>
    collection.transformObjectValue(entry, "key", (entry) => {
      return {
        name: formatter(entry.key),
        share: format.share(entry.value, data.count.total),
      };
    });
  const decodeLabelKey = (key, value) => {
    const { name, share } = key;
    return ` ${name}: ${formatNumber.default(value)} (${formatNumber.oneDecimal(
      share
    )}%)`;
  };
  const chartOptions = {
    common: {
      legend: {
        display: false,
      },
      animation: false,
      responsive: true,
      maintainAspectRatio: false,
      tooltips: {
        mode: "label",
        callbacks: {
          title: () => "",
          label: (tooltipItem, data) =>
            decodeLabelKey(
              data.labels[tooltipItem.index],
              data.datasets[0].data[tooltipItem.index]
            ),
        },
      },
    },
  };
  Object.assign(chartOptions, {
    doughnut: {
      ...chartOptions.common,
      cutoutPercentage: 0,
    },
    polar: {
      ...chartOptions.common,
      scale: {
        ticks: {
          display: false,
        },
      },
    },
    bar: {
      ...chartOptions.common,
      scales: {
        xAxes: [
          {
            offset: true,
            display: false,
            ticks: {
              beginAtZero: true,
            },
          },
        ],
        yAxes: [
          {
            offset: true,
            display: false,
            ticks: {
              beginAtZero: true,
            },
          },
        ],
      },
    },
    line: {
      ...chartOptions.common,
      tooltips: {
        mode: "index",
      },
      scales: {
        yAxes: [
          {
            stacked: true,
          },
        ],
      },
    },
  });

  const mapToChartData = (
    foldedData,
    formatter = format.identity,
    maxEntries = 0,
    otherLabel = t("stats-other")
  ) => {
    const valueRanks = collection.calculateRanks(foldedData, (_) =>
      Number(_.value)
    );
    const doMap = (data) => {
      // TODO: from configured theme: --header-background -> --header-color
      const colorGradients = color.colorGradient("#004", "#ddf", data.length);
      const colors = data
        .map((_) => Number(_.value))
        .map((value) => colorGradients[valueRanks[value]]);
      return [
        {
          labels: data.map(encodeLabelKey(formatter)).map((_) => _.key),
          datasets: [
            {
              data: data.map((_) => _.value),
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
      (data) => {
        return {
          key: otherLabel,
          value: data.map((_) => _.value).reduce((a, b) => a + b, 0),
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
  }) => {
    const flat = collection.foldToArray(original, comparator);
    const [data, valueRanks] = mapToChartData(
      flat,
      formatter,
      limit,
      otherLabel
    );
    return [flat, data, valueRanks];
  };
  const collectSummary = (count) => {
    return {
      key: "summary",
      title: t("stats-category-summary"),
      kpi: collection.foldToArray({
        photos: formatNumber.default(count.total),
        average: formatNumber.twoDecimal(
          count.total / (count.byTime.days || 1)
        ),
        years: formatNumber.default(Object.keys(count.byTime.byYear).length),
        months: formatNumber.default(
          Object.keys(count.byTime.byYearMonth).reduce(
            (acc, year) =>
              acc + Object.keys(count.byTime.byYearMonth[year]).length,
            0
          )
        ),
        days: formatNumber.default(count.byTime.days),
      }),
    };
  };
  const collectAuthor = (byAuthor, total) => {
    const [flat, data] = transformData({
      original: byAuthor,
    });
    const values = flat.map((entry) => entry.value);
    const mean = math.mean(values);
    const stddev = math.std(values);
    return {
      key: "author",
      title: t("stats-category-author"),
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
      table: flat.map((entry, index) => {
        return {
          key: encodeTableKey(entry.key),
          rank: formatNumber.default(index + 1),
          author: entry.key,
          count: formatNumber.default(entry.value),
          share: `${formatNumber.oneDecimal(
            format.share(entry.value, total)
          )}%`,
          standardScore: (entry.value - mean) / stddev,
        };
      }),
    };
  };
  const collectCountry = (byCountry, total) => {
    const [flat, data] = transformData({
      original: byCountry,
      formatter: (countryCode) =>
        format.countryName(lang, countryData)(countryCode),
    });
    const values = flat.map((entry) => entry.value);
    const mean = math.mean(values);
    const stddev = math.std(values);
    return {
      key: "country",
      title: t("stats-category-country"),
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
      table: flat.map((entry, index) => {
        return {
          key: encodeTableKey(entry.key),
          rank: formatNumber.default(index + 1),
          flag: (
            <>
              {countryData.isValid(entry.key) ? (
                <FlagIcon code={entry.key} />
              ) : (
                <></>
              )}
            </>
          ),
          country: <>{format.countryName(lang, countryData)(entry.key)}</>,
          count: formatNumber.default(entry.value),
          share: `${formatNumber.oneDecimal(
            format.share(entry.value, total)
          )}%`,
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

  const collectYearMonth = (byYearMonth, daysInYearMonth) => {
    const deep = Object.keys(byYearMonth)
      .sort((a, b) => a - b)
      .map((year) => {
        const allMonths = collection.objectFromArray(
          [...Array(12).keys()].map((_) => _ + 1),
          0
        );
        const m = {
          ...allMonths,
          ...byYearMonth[year],
        };
        return {
          key: year,
          value: collection.foldToArray(m, collection.numSortByFieldAsc("key")),
        };
      });
    const mapToChartData = (flat) => {
      if (!flat || !flat.length) {
        return {
          labels: [],
          datasets: [],
        };
      }
      // TODO: from configured theme: --header-background -> --header-color
      const colorGradients = color.colorGradient("#004", "#ddf", flat.length);
      return {
        labels: flat[0].value.map((entry) => t(`month-long-${entry.key}`)),
        datasets: flat.map((entry, i) => {
          return {
            label: entry.key,
            backgroundColor: colorGradients[i],
            data: entry.value.map((_) => _.value),
            fill: true,
            lineTension: 0.4,
          };
        }),
      };
    };
    const data = mapToChartData(deep);
    const flat = collection.trim(
      deep
        .sort((a, b) => Number(b.key) - Number(a.key))
        .flatMap((year) => {
          return year.value
            .sort((a, b) => Number(b.key) - Number(a.key))
            .map((month) => {
              return {
                key: [year.key, month.key],
                value: month.value,
              };
            });
        }),
      (entry) => entry.value > 0
    );
    const values = flat.map((entry) => {
      const [year, month] = entry.key;
      return entry.value / daysInYearMonth[year][month];
    });
    const mean = math.mean(values);
    const stddev = math.std(values);
    const valueRanks = collection.calculateRanks(flat, (_) => Number(_.value));
    return {
      key: "year-month",
      title: t("stats-category-year-month"),
      charts: [{ type: "line", data, options: chartOptions.line }],
      tableColumns: [
        { title: "rank", align: "right", header: true },
        { title: "year-month", align: "left" },
        { title: "count", align: "right" },
        { title: "average", align: "right" },
      ],
      table: flat.map((entry) => {
        const [year, month] = entry.key;
        return {
          key: encodeTableKey(entry.key.join("-")),
          rank: formatNumber.default(valueRanks[entry.value] + 1),
          "year-month": t("stats-year-month", {
            year,
            month: t(`month-long-${month}`),
          }),
          count: formatNumber.default(entry.value),
          average: formatNumber.twoDecimal(
            entry.value / daysInYearMonth[year][month]
          ),
          standardScore:
            (entry.value / daysInYearMonth[year][month] - mean) / stddev,
        };
      }),
    };
  };
  const collectYear = (byYear, daysInYear) => {
    const [flat, data, valueRanks] = transformData({
      original: byYear,
      comparator: collection.numSortByFieldAsc("key"),
    });
    const values = flat.map((entry) => {
      return entry.value / daysInYear[entry.key];
    });
    const mean = math.mean(values);
    const stddev = math.std(values);
    return {
      key: "year",
      title: t("stats-category-year"),
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
      table: flat.map((entry) => {
        return {
          key: encodeTableKey(entry.key),
          rank: formatNumber.default(valueRanks[entry.value] + 1),
          year: entry.key,
          count: formatNumber.default(entry.value),
          average: t("stats-per-day", {
            count: formatNumber.twoDecimal(entry.value / daysInYear[entry.key]),
          }),
          standardScore: (entry.value / daysInYear[entry.key] - mean) / stddev,
        };
      }),
    };
  };
  const collectMonth = (byMonth, total) => {
    const [flat, data, valueRanks] = transformData({
      original: byMonth,
      comparator: collection.numSortByFieldAsc("key"),
      formatter: (month) => t(`month-long-${month}`),
      limit: 12,
    });
    const values = flat.map((entry) => entry.value);
    const mean = math.mean(values);
    const stddev = math.std(values);
    return {
      key: "month",
      title: t("stats-category-month"),
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
      table: flat.map((entry) => {
        return {
          key: encodeTableKey(entry.key),
          rank: formatNumber.default(valueRanks[entry.value] + 1),
          month: t(`month-long-${entry.key}`),
          count: formatNumber.default(entry.value),
          share: `${formatNumber.oneDecimal(
            format.share(entry.value, total)
          )}%`,
          standardScore: (entry.value - mean) / stddev,
        };
      }),
    };
  };
  const collectWeekday = (byWeekday, total) => {
    const [flat, data, valueRanks] = transformData({
      original: collection.transformObjectKeys(byWeekday, (dow, value) => {
        const key = dow < config.FIRST_WEEKDAY ? Number(dow) + 7 : dow;
        return [key, value];
      }),
      comparator: collection.numSortByFieldAsc("key"),
      formatter: (dow) => t(`weekday-long-${format.dayOfWeek(dow)}`),
      limit: 24,
    });
    const values = flat.map((entry) => entry.value);
    const mean = math.mean(values);
    const stddev = math.std(values);
    return {
      key: "weekday",
      title: t("stats-category-weekday"),
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
      table: flat.map((entry) => {
        return {
          key: encodeTableKey(entry.key),
          rank: formatNumber.default(valueRanks[entry.value] + 1),
          weekday: t(`weekday-long-${format.dayOfWeek(entry.key)}`),
          count: formatNumber.default(entry.value),
          share: `${formatNumber.oneDecimal(
            format.share(entry.value, total)
          )}%`,
          standardScore: (entry.value - mean) / stddev,
        };
      }),
    };
  };
  const collectHour = (byHour, total) => {
    const [flat, data, valueRanks] = transformData({
      original: byHour,
      comparator: collection.numSortByFieldAsc("key"),
      formatter: (hour) => `${format.padNumber(hour, 2)}:00–`,
      limit: 24,
    });
    const values = flat.map((entry) => entry.value);
    const mean = math.mean(values);
    const stddev = math.std(values);
    return {
      key: "hour",
      title: t("stats-category-hour"),
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
      table: flat.map((entry) => {
        return {
          key: encodeTableKey(entry.key),
          rank: formatNumber.default(valueRanks[entry.value] + 1),
          hour: `${format.padNumber(entry.key, 2)}:00–`,
          count: formatNumber.default(entry.value),
          share: `${formatNumber.oneDecimal(
            format.share(entry.value, total)
          )}%`,
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

  const collectCameraMake = (byCameraMake, total) => {
    const [flat, data] = transformData({
      original: byCameraMake,
    });
    const values = flat.map((entry) => entry.value);
    const mean = math.mean(values);
    const stddev = math.std(values);
    return {
      key: "camera-make",
      title: t("stats-category-camera-make"),
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
      table: flat.map((entry, index) => {
        return {
          key: encodeTableKey(entry.key),
          rank: formatNumber.default(index + 1),
          "camera-make": entry.key,
          count: formatNumber.default(entry.value),
          share: `${formatNumber.oneDecimal(
            format.share(entry.value, total)
          )}%`,
          standardScore: (entry.value - mean) / stddev,
        };
      }),
    };
  };
  const collectCamera = (byCamera, total) => {
    const [flat, data] = transformData({
      original: byCamera,
    });
    const values = flat.map((entry) => entry.value);
    const mean = math.mean(values);
    const stddev = math.std(values);
    return {
      key: "camera",
      title: t("stats-category-camera"),
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
      table: flat.map((entry, index) => {
        return {
          key: encodeTableKey(entry.key),
          rank: formatNumber.default(index + 1),
          camera: entry.key,
          count: formatNumber.default(entry.value),
          share: `${formatNumber.oneDecimal(
            format.share(entry.value, total)
          )}%`,
          standardScore: (entry.value - mean) / stddev,
        };
      }),
    };
  };
  const collectLens = (byLens, total) => {
    const [flat, data] = transformData({
      original: byLens,
    });
    const values = flat.map((entry) => entry.value);
    const mean = math.mean(values);
    const stddev = math.std(values);
    return {
      key: "lens",
      title: t("stats-category-lens"),
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
      table: flat.map((entry, index) => {
        return {
          key: encodeTableKey(entry.key),
          rank: formatNumber.default(index + 1),
          lens: entry.key,
          count: formatNumber.default(entry.value),
          share: `${formatNumber.oneDecimal(
            format.share(entry.value, total)
          )}%`,
          standardScore: (entry.value - mean) / stddev,
        };
      }),
    };
  };
  const collectCameraLens = (byCameraLens, total) => {
    const [flat, data] = transformData({
      original: byCameraLens,
      formatter: (cameraLens) => JSON.parse(cameraLens).join(" + "),
      limit: 20,
      otherLabel: JSON.stringify([t("stats-other"), t("stats-other")]),
    });
    const values = flat.map((entry) => entry.value);
    const mean = math.mean(values);
    const stddev = math.std(values);
    return {
      key: "camera-lens",
      title: t("stats-category-camera-lens"),
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
      table: flat.map((entry, index) => {
        return {
          key: encodeTableKey(entry.key),
          rank: formatNumber.default(index + 1),
          "camera-lens": JSON.parse(entry.key).join(" + "),
          count: formatNumber.default(entry.value),
          share: `${formatNumber.oneDecimal(
            format.share(entry.value, total)
          )}%`,
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

  const collectFocalLength = (byFocalLength, total) => {
    const [flat, data, valueRanks] = transformData({
      original: byFocalLength,
      formatter: formatExposure.focalLength,
      comparator: collection.numSortByFieldAsc("key"),
    });
    const values = flat.map((entry) => entry.value);
    const mean = math.mean(values);
    const stddev = math.std(values);
    return {
      key: "focal-length",
      title: t("stats-category-focal-length"),
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
      table: flat.map((entry) => {
        return {
          key: encodeTableKey(entry.key),
          rank: formatNumber.default(valueRanks[entry.value] + 1),
          "focal-length": formatExposure.focalLength(entry.key),
          count: formatNumber.default(entry.value),
          share: `${formatNumber.oneDecimal(
            format.share(entry.value, total)
          )}%`,
          standardScore: (entry.value - mean) / stddev,
        };
      }),
    };
  };
  const collectAperture = (byAperture, total) => {
    const [flat, data, valueRanks] = transformData({
      original: byAperture,
      formatter: formatExposure.aperture,
      comparator: collection.numSortByFieldAsc("key"),
    });
    const values = flat.map((entry) => entry.value);
    const mean = math.mean(values);
    const stddev = math.std(values);
    return {
      key: "aperture",
      title: t("stats-category-aperture"),
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
      table: flat.map((entry) => {
        return {
          key: encodeTableKey(entry.key),
          rank: formatNumber.default(valueRanks[entry.value] + 1),
          aperture: formatExposure.aperture(entry.key),
          count: formatNumber.default(entry.value),
          share: `${formatNumber.oneDecimal(
            format.share(entry.value, total)
          )}%`,
          standardScore: (entry.value - mean) / stddev,
        };
      }),
    };
  };
  const collectExposureTime = (byExposureTime, total) => {
    const [flat, data, valueRanks] = transformData({
      original: byExposureTime,
      formatter: formatExposure.exposureTime,
      comparator: collection.numSortByFieldDesc("key"),
    });
    const values = flat.map((entry) => entry.value);
    const mean = math.mean(values);
    const stddev = math.std(values);
    return {
      key: "exposure-time",
      title: t("stats-category-exposure-time"),
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
      table: flat.map((entry) => {
        return {
          key: encodeTableKey(entry.key),
          rank: formatNumber.default(valueRanks[entry.value] + 1),
          "exposure-time": formatExposure.exposureTime(entry.key),
          count: formatNumber.default(entry.value),
          share: `${formatNumber.oneDecimal(
            format.share(entry.value, total)
          )}%`,
          standardScore: (entry.value - mean) / stddev,
        };
      }),
    };
  };
  const collectIso = (byIso, total) => {
    const [flat, data, valueRanks] = transformData({
      original: byIso,
      formatter: formatExposure.iso,
      comparator: collection.numSortByFieldAsc("key"),
    });
    const values = flat.map((entry) => entry.value);
    const mean = math.mean(values);
    const stddev = math.std(values);
    return {
      key: "iso",
      title: t("stats-category-iso"),
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
      table: flat.map((entry) => {
        return {
          key: encodeTableKey(entry.key),
          rank: formatNumber.default(valueRanks[entry.value] + 1),
          iso: formatExposure.iso(entry.key),
          count: formatNumber.default(entry.value),
          share: `${formatNumber.oneDecimal(
            format.share(entry.value, total)
          )}%`,
          standardScore: (entry.value - mean) / stddev,
        };
      }),
    };
  };
  const collectExposureValue = (byExposureValue, total) => {
    const [flat, data, valueRanks] = transformData({
      original: byExposureValue,
      formatter: formatExposure.ev,
      comparator: collection.numSortByFieldAsc("key"),
    });
    const values = flat.map((entry) => entry.value);
    const mean = math.mean(values);
    const stddev = math.std(values);
    return {
      key: "ev",
      title: t("stats-category-ev"),
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
      table: flat.map((entry) => {
        return {
          key: encodeTableKey(entry.key),
          rank: formatNumber.default(valueRanks[entry.value] + 1),
          ev: formatExposure.ev(entry.key),
          count: formatNumber.default(entry.value),
          share: `${formatNumber.oneDecimal(
            format.share(entry.value, total)
          )}%`,
          standardScore: (entry.value - mean) / stddev,
        };
      }),
    };
  };
  const collectLightValue = (byLightValue, total) => {
    const [flat, data, valueRanks] = transformData({
      original: byLightValue,
      formatter: formatExposure.ev,
      comparator: collection.numSortByFieldAsc("key"),
    });
    const values = flat.map((entry) => entry.value);
    const mean = math.mean(values);
    const stddev = math.std(values);
    return {
      key: "lv",
      title: t("stats-category-lv"),
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
      table: flat.map((entry) => {
        return {
          key: encodeTableKey(entry.key),
          rank: formatNumber.default(valueRanks[entry.value] + 1),
          lv: formatExposure.ev(entry.key),
          count: formatNumber.default(entry.value),
          share: `${formatNumber.oneDecimal(
            format.share(entry.value, total)
          )}%`,
          standardScore: (entry.value - mean) / stddev,
        };
      }),
    };
  };
  const collectResolution = (byResolution, total) => {
    const [flat, data, valueRanks] = transformData({
      original: byResolution,
      formatter: formatExposure.resolution,
      comparator: collection.numSortByFieldAsc("key"),
    });
    const values = flat.map((entry) => entry.value);
    const mean = math.mean(values);
    const stddev = math.std(values);
    return {
      key: "resolution",
      title: t("stats-category-resolution"),
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
      table: flat.map((entry) => {
        return {
          key: encodeTableKey(entry.key),
          rank: formatNumber.default(valueRanks[entry.value] + 1),
          resolution: formatExposure.resolution(entry.key),
          count: formatNumber.default(entry.value),
          share: `${formatNumber.oneDecimal(
            format.share(entry.value, total)
          )}%`,
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
      ],
    };
  };

  return [collectGeneral(), collectTime(), collectGear(), collectExposure()];
};

export default { UNKNOWN, decodeTableRowKey, generate, collectTopics };

/**
 * Collect statistics from photos
 *
 * @param {array} photos The photos over which the statistics should be collected.
 * @return Distribution statistics of the given photos over various parameters and their combinations.
 */
const collectStatistics = (photos, unknownLabel) => {
  const stats = {
    count: {
      total: 0,
      byTime: {
        byYear: {},
        byYearMonth: {},
        byMonth: {},
        byWeekday: {},
        byHour: {},
        daysInYear: 0,
        daysInYearMonth: {},
      },
      byExposure: {},
      byGear: {},
      byAuthor: {},
      byCountry: {},
    },
  };

  populateDistributions(photos, stats, unknownLabel);
  return stats;
};

/**
 * Populate the statistical distribution of the photos by several parameters.
 *
 * @param {array} photos The photos over which the statistics should be collected.
 * @param {object} stats The target structure for collecting statistics.
 */
const populateDistributions = (photos, stats, unknownLabel) => {
  photos.forEach((photo) => {
    stats.count.total++;

    const countryCode = photo.countryCode() || unknownLabel;
    stats.count.byCountry[countryCode] =
      stats.count.byCountry[countryCode] || 0;
    stats.count.byCountry[countryCode]++;

    const author = photo.author() || unknownLabel;
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
        photo.focalLength() > 0 ? photo.focalLength() : unknownLabel;
      const aperture = photo.aperture() || unknownLabel;
      const exposureTime = photo.exposureTime() || unknownLabel;
      const iso = photo.iso() || unknownLabel;

      return {
        focalLength,
        aperture,
        exposureTime,
        iso,
      };
    };
    photo.exposure = adjustExposure();
    updateExposureDistribution(stats.count.byExposure, photo, unknownLabel);
    updateGear(stats.count.byGear, photo, unknownLabel);
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
const updateTimeDistribution = (byTime, year, month, day, weekday, hour) => {
  const canonDate = (ymd) => ymd.year * 10000 + ymd.month * 100 + ymd.day;

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

  byTime.byYear = byTime.byYear || {};
  byTime.byYear[year] = byTime.byYear[year] || 0;
  byTime.byYear[year]++;

  byTime.byYearMonth = byTime.byYearMonth || {};
  byTime.byYearMonth[year] = byTime.byYearMonth[year] || {};
  byTime.byYearMonth[year][month] = byTime.byYearMonth[year][month] || 0;
  byTime.byYearMonth[year][month]++;

  byTime.byMonth =
    byTime.byMonth ||
    collection.objectFromArray(
      [...Array(12).keys()].map((month) => month + 1),
      0
    );
  byTime.byMonth[month] = byTime.byMonth[month] || 0;
  byTime.byMonth[month]++;

  byTime.byWeekday =
    byTime.byWeekday || collection.objectFromArray([...Array(7).keys()], 0);
  byTime.byWeekday[weekday] = byTime.byWeekday[weekday] || 0;
  byTime.byWeekday[weekday]++;

  byTime.byHour =
    byTime.byHour || collection.objectFromArray([...Array(24).keys()], 0);
  byTime.byHour[hour] = byTime.byHour[hour] || 0;
  byTime.byHour[hour]++;

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
const updateExposureDistribution = (byExposure, photo, unknownLabel) => {
  const focalLength = Number(photo.focalLength()) || unknownLabel;
  byExposure.byFocalLength = byExposure.byFocalLength || {};
  byExposure.byFocalLength[focalLength] =
    byExposure.byFocalLength[focalLength] || 0;
  byExposure.byFocalLength[focalLength]++;

  const aperture = Number(photo.aperture()) || unknownLabel;
  byExposure.byAperture = byExposure.byAperture || {};
  byExposure.byAperture[aperture] = byExposure.byAperture[aperture] || 0;
  byExposure.byAperture[aperture]++;

  const exposureTime = Number(photo.exposureTime()) || unknownLabel;
  byExposure.byExposureTime = byExposure.byExposureTime || {};
  byExposure.byExposureTime[exposureTime] =
    byExposure.byExposureTime[exposureTime] || 0;
  byExposure.byExposureTime[exposureTime]++;

  const iso = Number(photo.iso()) || unknownLabel;
  byExposure.byIso = byExposure.byIso || {};
  byExposure.byIso[iso] = byExposure.byIso[iso] || 0;
  byExposure.byIso[iso]++;

  if (exposureTime) {
    const exposureValue = Number(photo.exposureValue()) || unknownLabel;
    byExposure.byExposureValue = byExposure.byExposureValue || {};
    byExposure.byExposureValue[exposureValue] =
      byExposure.byExposureValue[exposureValue] || 0;
    byExposure.byExposureValue[exposureValue]++;

    // LV = EV at ISO 100
    const lightValue = Number(photo.lightValue()) || unknownLabel;
    byExposure.byLightValue = byExposure.byLightValue || {};
    byExposure.byLightValue[lightValue] =
      byExposure.byLightValue[lightValue] || 0;
    byExposure.byLightValue[lightValue]++;
  }

  const resolution = Number(photo.resolution()) || unknownLabel;
  byExposure.byResolution = byExposure.byResolution || {};
  byExposure.byResolution[resolution] =
    byExposure.byResolution[resolution] || 0;
  byExposure.byResolution[resolution]++;
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
const updateGear = (byGear, photo, unknownLabel) => {
  const cameraMake = photo.cameraMake() || unknownLabel;
  byGear.byCameraMake = byGear.byCameraMake || {};
  byGear.byCameraMake[cameraMake] = byGear.byCameraMake[cameraMake] || 0;
  byGear.byCameraMake[cameraMake]++;

  const camera = photo.formatCamera() || unknownLabel;
  const lens = photo.formatLens() || unknownLabel;
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
 * Produces the number of days in the following structure:
 *
 * - days
 * - daysInYear[year]
 * - daysInYearMonth[year][month]
 *
 * @param {object} byTime Target for collecting the time distribution over all photos
 */
const calculateNumberOfDays = (byTime) => {
  const isLeap = (year) =>
    year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const MONTH_LENGTH = {
    true: [0, 31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31],
    false: [0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31],
  };

  if (byTime.minDate && byTime.maxDate) {
    const minYear = byTime.minDate.year;
    const maxYear = byTime.maxDate.year;
    byTime.daysInYear = byTime.daysInYear || {};
    byTime.daysInYear[minYear] = 0;
    byTime.daysInYearMonth = byTime.daysInYearMonth || {};
    byTime.daysInYearMonth[minYear] = {};

    const maxMonth = minYear === maxYear ? byTime.maxDate.month : 12;
    for (let m = byTime.minDate.month; m <= maxMonth; m++) {
      byTime.byYearMonth[minYear][m] = byTime.byYearMonth[minYear][m] || 0;
      if (minYear === maxYear && byTime.minDate.month === maxMonth) {
        byTime.daysInYear[minYear] += byTime.daysInYearMonth[minYear][m] =
          byTime.maxDate.day - byTime.minDate.day + 1;
      } else if (m === byTime.minDate.month) {
        byTime.daysInYear[minYear] += byTime.daysInYearMonth[minYear][m] =
          MONTH_LENGTH[isLeap(minYear)][m] - byTime.minDate.day + 1;
      } else {
        byTime.daysInYear[minYear] += byTime.daysInYearMonth[minYear][m] =
          MONTH_LENGTH[isLeap(minYear)][m];
      }
    }

    for (let y = minYear + 1; y < maxYear; y++) {
      const leap = isLeap(y);
      byTime.byYear[y] = byTime.byYear[y] || 0;
      byTime.daysInYear[y] = leap ? 366 : 365;

      byTime.byYearMonth[y] = byTime.byYearMonth[y] || {};
      byTime.daysInYearMonth[y] = {};
      for (let m = 1; m <= 12; m++) {
        byTime.byYearMonth[y][m] = byTime.byYearMonth[y][m] || 0;
        byTime.daysInYearMonth[y][m] = MONTH_LENGTH[leap][m];
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
          MONTH_LENGTH[isLeap(maxYear)][m];
      }
    }
  }
  byTime.days = Object.values(byTime.daysInYear).reduce((a, b) => a + b, 0);
};
