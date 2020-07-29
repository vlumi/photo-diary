import React from "react";

import FlagIcon from "../components/FlagIcon";

import format from "./format";
import collection from "./collection";
import color from "./color";
import config from "./config";

const generate = async (gallery, unknownLabel) => {
  return collectStatistics(gallery.photos(), unknownLabel);
};

const collectTopics = (data, lang, t, countryData) => {
  const numberFormatter = new Intl.NumberFormat(lang).format;

  const decodeLabelKey = (key, value) => {
    const [name, share] = key;
    return ` ${name}: ${numberFormatter(value)} (${share}%)`;
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
      tooltips: {},
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
    maxEntries = 0
  ) => {
    const encodeLabelKey = (entry) =>
      collection.transformObjectValue(entry, "key", (entry) => [
        formatter(entry.key),
        format.share(entry.value, data.count.total),
      ]);
    const doMap = (data) => {
      const valueRanks = Object.fromEntries(
        data
          .map((_) => Number(_.value))
          .sort((a, b) => b - a)
          .map((value, i) => [value, i])
      );
      // TODO: from configured theme: --header-background -> --header-color
      const colorGradients = color.colorGradient("#004", "#ddf", data.length);
      const colors = data
        .map((_) => Number(_.value))
        .map((value) => colorGradients[valueRanks[value]]);
      return {
        labels: data.map(encodeLabelKey).map((_) => _.key),
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
      };
    };
    return collection.truncateAndProcess(
      foldedData,
      maxEntries,
      doMap,
      (data) => {
        return {
          key: t("stats-other"),
          value: data.map((_) => _.value).reduce((a, b) => a + b, 0),
        };
      }
    );
  };
  const transformData = ({
    rawData,
    comparator = collection.numSortByFieldDesc("value"),
    formatter = format.identity,
    limit = 0,
  }) => {
    const flat = collection.foldToArray(rawData, comparator);
    const data = mapToChartData(flat, formatter, limit);
    return [flat, data];
  };

  const collectSummary = (count) => {
    return {
      name: "summary",
      title: t("stats-category-summary"),
      kpi: collection.foldToArray({
        // TODO: more kpis
        total: count.total,
        days: count.byTime.days,
        average:
          Math.round((count.total * 100) / (count.byTime.days || 1)) / 100,
      }),
    };
  };
  const collectAuthor = (byAuthor, total) => {
    const [flat, data] = transformData({
      rawData: byAuthor,
    });
    return {
      name: "author",
      title: t("stats-category-author"),
      charts: [
        { type: "doughnut", data, options: chartOptions.doughnut },
        { type: "horizontal-bar", data, options: chartOptions.bar },
      ],
      rawHeader: true,
      rawColumns: [{ align: "left" }, { align: "right" }, { align: "right" }],
      raw: flat.map((entry) => [
        entry.key,
        numberFormatter(entry.value),
        `${format.share(entry.value, total)}%`,
      ]),
    };
  };
  const collectCountry = (byCountry, total) => {
    const [flat, data] = transformData({
      rawData: byCountry,
      formatter: (countryCode) =>
        format.countryName(countryCode, lang, countryData),
    });
    return {
      name: "country",
      title: t("stats-category-country"),
      charts: [
        { type: "doughnut", data, options: chartOptions.doughnut },
        { type: "horizontal-bar", data, options: chartOptions.bar },
      ],
      rawHeader: true,
      rawColumns: [
        { align: "right" },
        { align: "left" },
        { align: "right" },
        { align: "right" },
      ],
      raw: flat.map((entry) => [
        <>
          {countryData.isValid(entry.key) ? (
            <FlagIcon code={entry.key} />
          ) : (
            <></>
          )}
        </>,
        <>{format.countryName(entry.key, lang, countryData)}</>,
        numberFormatter(entry.value),
        `${format.share(entry.value, total)}%`,
      ]),
    };
  };
  const collectGeneral = () => {
    const count = data.count;
    const total = count.total;
    return {
      name: "general",
      title: t("stats-topic-general"),
      categories: [
        collectSummary(count),
        collectAuthor(count.byAuthor, total),
        collectCountry(count.byCountry, total),
      ],
    };
  };

  const collectYear = (byYear, total) => {
    const [flat, data] = transformData({
      rawData: byYear,
      comparator: collection.numSortByFieldAsc("key"),
    });
    return {
      name: "year",
      title: t("stats-category-year"),
      charts: [
        { type: "doughnut", data, options: chartOptions.doughnut },
        { type: "horizontal-bar", data, options: chartOptions.bar },
      ],
      rawHeader: false,
      rawColumns: [{ align: "left" }, { align: "right" }, { align: "right" }],
      raw: flat.map((entry) => [
        entry.key,
        numberFormatter(entry.value),
        `${format.share(entry.value, total)}%`,
      ]),
    };
  };
  const collectYearMonth = (byYearMonth, total) => {
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
          value: collection
            .foldToArray(m, collection.numSortByFieldAsc("key"))
            .map((entry) =>
              collection.transformObjectValue(entry, "key", (entry) =>
                t(`month-long-${entry.key}`)
              )
            ),
        };
      });
    const mapToChartData = (flat) => {
      // TODO: from configured theme: --header-background -> --header-color
      const colorGradients = color.colorGradient("#004", "#ddf", flat.length);
      return {
        labels: flat[0].value.map((_) => _.key),
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
        .sort((a, b) => a - b)
        .flatMap((year) => {
          return year.value
            .sort((a, b) => a - b)
            .map((month) => {
              return {
                key: `${year.key} / ${month.key}`,
                value: month.value,
              };
            });
        }),
      (entry) => entry.value > 0
    );
    return {
      name: "year-month",
      title: t("stats-category-year-month"),
      charts: [{ type: "line", data, options: chartOptions.line }],
      rawHeader: false,
      rawColumns: [{ align: "left" }, { align: "right" }, { align: "right" }],
      raw: flat.map((entry) => [
        entry.key,
        numberFormatter(entry.value),
        `${format.share(entry.value, total)}%`,
      ]),
    };
  };
  const collectMonth = (byMonth, total) => {
    const [flat, data] = transformData({
      rawData: byMonth,
      comparator: collection.numSortByFieldAsc("key"),
      formatter: (month) => t(`month-long-${month}`),
      limit: 12,
    });
    return {
      name: "month",
      title: t("stats-category-month"),
      charts: [
        { type: "polar", data, options: chartOptions.polar },
        { type: "horizontal-bar", data, options: chartOptions.bar },
      ],
      rawHeader: false,
      rawColumns: [{ align: "left" }, { align: "right" }, { align: "right" }],
      raw: flat.map((entry) => [
        t(`month-long-${entry.key}`),
        numberFormatter(entry.value),
        `${format.share(entry.value, total)}%`,
      ]),
    };
  };
  const collectWeekday = (byWeekday, total) => {
    const [flat, data] = transformData({
      rawData: collection.transformObjectKeys(byWeekday, (dow, value) => {
        const key = dow < config.FIRST_WEEKDAY ? Number(dow) + 7 : dow;
        return [key, value];
      }),
      comparator: collection.numSortByFieldAsc("key"),
      formatter: (dow) => t(`weekday-long-${format.dayOfWeek(dow)}`),
      limit: 24,
    });
    return {
      name: "weekday",
      title: t("stats-category-weekday"),
      charts: [
        { type: "polar", data, options: chartOptions.polar },
        { type: "horizontal-bar", data, options: chartOptions.bar },
      ],
      rawHeader: false,
      rawColumns: [{ align: "left" }, { align: "right" }, { align: "right" }],
      raw: flat.map((entry) => [
        t(`weekday-long-${format.dayOfWeek(entry.key)}`),
        numberFormatter(entry.value),
        `${format.share(entry.value, total)}%`,
      ]),
    };
  };
  const collectHour = (byHour, total) => {
    const [flat, data] = transformData({
      rawData: byHour,
      comparator: collection.numSortByFieldAsc("key"),
      formatter: (hour) => `${format.padNumber(hour, 2)}:00–`,
      limit: 24,
    });
    return {
      name: "hour",
      title: t("stats-category-hour"),
      charts: [
        { type: "polar", data, options: chartOptions.polar },
        { type: "horizontal-bar", data, options: chartOptions.bar },
      ],
      rawHeader: false,
      rawColumns: [{ align: "left" }, { align: "right" }, { align: "right" }],
      raw: flat.map((entry) => [
        `${format.padNumber(entry.key, 2)}:00–`,
        numberFormatter(entry.value),
        `${format.share(entry.value, total)}%`,
      ]),
    };
  };
  const collectTime = () => {
    const total = data.count.total;
    const byTime = data.count.byTime;
    return {
      name: "time",
      title: t("stats-topic-time"),
      categories: [
        collectYear(byTime.byYear, total),
        collectYearMonth(byTime.byYearMonth, total),
        collectMonth(byTime.byMonthOfYear, total),
        collectWeekday(byTime.byDayOfWeek, total),
        collectHour(byTime.byHourOfDay, total),
      ],
    };
  };

  const collectCameraMake = (byCameraMake, total) => {
    const [flat, data] = transformData({
      rawData: byCameraMake,
    });
    return {
      name: "camera-make",
      title: t("stats-category-camera-make"),
      charts: [
        { type: "doughnut", data, options: chartOptions.doughnut },
        { type: "horizontal-bar", data, options: chartOptions.bar },
      ],
      rawHeader: true,
      rawColumns: [{ align: "left" }, { align: "right" }, { align: "right" }],
      raw: flat.map((entry) => [
        entry.key,
        numberFormatter(entry.value),
        `${format.share(entry.value, total)}%`,
      ]),
    };
  };
  const collectCamera = (byCamera, total) => {
    const [flat, data] = transformData({
      rawData: byCamera,
    });
    return {
      name: "camera",
      title: t("stats-category-camera"),
      charts: [
        { type: "doughnut", data, options: chartOptions.doughnut },
        { type: "horizontal-bar", data, options: chartOptions.bar },
      ],
      rawHeader: true,
      rawColumns: [{ align: "left" }, { align: "right" }, { align: "right" }],
      raw: flat.map((entry) => [
        entry.key,
        numberFormatter(entry.value),
        `${format.share(entry.value, total)}%`,
      ]),
    };
  };
  const collectLens = (byLens, total) => {
    const [flat, data] = transformData({
      rawData: byLens,
    });
    return {
      name: "lens",
      title: t("stats-category-lens"),
      charts: [
        { type: "doughnut", data, options: chartOptions.doughnut },
        { type: "horizontal-bar", data, options: chartOptions.bar },
      ],
      rawHeader: true,
      rawColumns: [{ align: "left" }, { align: "right" }, { align: "right" }],
      raw: flat.map((entry) => [
        entry.key,
        numberFormatter(entry.value),
        `${format.share(entry.value, total)}%`,
      ]),
    };
  };
  const collectCameraLens = (byCameraLens, total) => {
    const [flat, data] = transformData({
      rawData: byCameraLens,
      limit: 20,
    });
    return {
      name: "camera-lens",
      title: t("stats-category-camera-lens"),
      charts: [
        { type: "doughnut", data, options: chartOptions.doughnut },
        { type: "horizontal-bar", data, options: chartOptions.bar },
      ],
      rawHeader: true,
      rawColumns: [{ align: "left" }, { align: "right" }, { align: "right" }],
      raw: flat.map((entry) => [
        entry.key,
        numberFormatter(entry.value),
        `${format.share(entry.value, total)}%`,
      ]),
    };
  };
  const collectGear = () => {
    const total = data.count.total;
    const byGear = data.count.byGear;
    return {
      name: "gear",
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
    const [flat, data] = transformData({
      rawData: byFocalLength,
      comparator: collection.numSortByFieldAsc("key"),
    });
    return {
      name: "focal-length",
      title: t("stats-category-focal-length"),
      charts: [
        { type: "doughnut", data, options: chartOptions.doughnut },
        { type: "horizontal-bar", data, options: chartOptions.bar },
      ],
      rawHeader: false,
      rawColumns: [{ align: "left" }, { align: "right" }, { align: "right" }],
      raw: flat.map((entry) => [
        format.focalLength(entry.key),
        numberFormatter(entry.value),
        `${format.share(entry.value, total)}%`,
      ]),
    };
  };
  const collectAperture = (byAperture, total) => {
    const [flat, data] = transformData({
      rawData: byAperture,
      comparator: collection.numSortByFieldAsc("key"),
    });
    return {
      name: "aperture",
      title: t("stats-category-aperture"),
      charts: [
        { type: "doughnut", data, options: chartOptions.doughnut },
        { type: "horizontal-bar", data, options: chartOptions.bar },
      ],
      rawHeader: false,
      rawColumns: [{ align: "left" }, { align: "right" }, { align: "right" }],
      raw: flat.map((entry) => [
        format.aperture(entry.key),
        numberFormatter(entry.value),
        `${format.share(entry.value, total)}%`,
      ]),
    };
  };
  const collectExposureTime = (byExposureTime, total) => {
    const [flat, data] = transformData({
      rawData: byExposureTime,
      comparator: collection.numSortByFieldDesc("key"),
    });
    return {
      name: "exposure-time",
      title: t("stats-category-exposure-time"),
      charts: [
        { type: "doughnut", data, options: chartOptions.doughnut },
        { type: "horizontal-bar", data, options: chartOptions.bar },
      ],
      rawHeader: false,
      rawColumns: [{ align: "left" }, { align: "right" }, { align: "right" }],
      raw: flat.map((entry) => [
        format.exposureTime(entry.key),
        numberFormatter(entry.value),
        `${format.share(entry.value, total)}%`,
      ]),
    };
  };
  const collectIso = (byIso, total) => {
    const [flat, data] = transformData({
      rawData: byIso,
      comparator: collection.numSortByFieldAsc("key"),
    });
    return {
      name: "iso",
      title: t("stats-category-iso"),
      charts: [
        { type: "doughnut", data, options: chartOptions.doughnut },
        { type: "horizontal-bar", data, options: chartOptions.bar },
      ],
      rawHeader: false,
      rawColumns: [{ align: "left" }, { align: "right" }, { align: "right" }],
      raw: flat.map((entry) => [
        format.iso(entry.key),
        numberFormatter(entry.value),
        `${format.share(entry.value, total)}%`,
      ]),
    };
  };
  const collectEv = (byEv, total) => {
    const [flat, data] = transformData({
      rawData: byEv,
      comparator: collection.numSortByFieldAsc("key"),
    });
    return {
      name: "ev",
      title: t("stats-category-ev"),
      charts: [
        { type: "doughnut", data, options: chartOptions.doughnut },
        { type: "horizontal-bar", data, options: chartOptions.bar },
      ],
      rawHeader: false,
      rawColumns: [{ align: "left" }, { align: "right" }, { align: "right" }],
      raw: flat.map((entry) => [
        entry.key,
        numberFormatter(entry.value),
        `${format.share(entry.value, total)}%`,
      ]),
    };
  };
  const collectLv = (byLv, total) => {
    const [flat, data] = transformData({
      rawData: byLv,
      comparator: collection.numSortByFieldAsc("key"),
    });
    return {
      name: "lv",
      title: t("stats-category-lv"),
      charts: [
        { type: "doughnut", data, options: chartOptions.doughnut },
        { type: "horizontal-bar", data, options: chartOptions.bar },
      ],
      rawHeader: false,
      rawColumns: [{ align: "left" }, { align: "right" }, { align: "right" }],
      raw: flat.map((entry) => [
        entry.key,
        numberFormatter(entry.value),
        `${format.share(entry.value, total)}%`,
      ]),
    };
  };
  const collectExposure = () => {
    const total = data.count.total;
    const byExposure = data.count.byExposure;
    return {
      name: "exposure",
      title: t("stats-topic-exposure"),
      categories: [
        collectFocalLength(byExposure.byFocalLength, total),
        collectAperture(byExposure.byAperture, total),
        collectExposureTime(byExposure.byExposureTime, total),
        collectIso(byExposure.byIso, total),
        collectEv(byExposure.byExposureValue, total),
        collectLv(byExposure.byLightValue, total),
      ],
    };
  };

  return [collectGeneral(), collectTime(), collectGear(), collectExposure()];
};

export default { generate, collectTopics };

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
      byTime: {},
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
 * - byMonthOfYear[month]
 * - byDayOfWeek[day]
 * - byHourOfDay[hour]
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
const updateTimeDistribution = (byTime, year, month, day, hour) => {
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

  byTime.byMonthOfYear =
    byTime.byMonthOfYear ||
    collection.objectFromArray(
      [...Array(12).keys()].map((month) => month + 1),
      0
    );
  byTime.byMonthOfYear[month] = byTime.byMonthOfYear[month] || 0;
  byTime.byMonthOfYear[month]++;

  const dow = new Date(year, month - 1, day).getDay();
  byTime.byDayOfWeek =
    byTime.byDayOfWeek || collection.objectFromArray([...Array(7).keys()], 0);
  byTime.byDayOfWeek[dow] = byTime.byDayOfWeek[dow] || 0;
  byTime.byDayOfWeek[dow]++;

  byTime.byHourOfDay =
    byTime.byHourOfDay || collection.objectFromArray([...Array(24).keys()], 0);
  byTime.byHourOfDay[hour] = byTime.byHourOfDay[hour] || 0;
  byTime.byHourOfDay[hour]++;

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
    // Round EV and LV to the closest half
    const roundEv = (value) => Math.round(value * 2) / 2;
    const fullExposureValue = Math.log2(aperture ** 2 / exposureTime);
    const exposureValue = roundEv(fullExposureValue) || unknownLabel;
    byExposure.byExposureValue = byExposure.byExposureValue || {};
    byExposure.byExposureValue[exposureValue] =
      byExposure.byExposureValue[exposureValue] || 0;
    byExposure.byExposureValue[exposureValue]++;

    // LV = EV at ISO 100
    const fullLightValue = fullExposureValue + Math.log2(iso / 100);
    const lightValue = roundEv(fullLightValue) || unknownLabel;
    byExposure.byLightValue = byExposure.byLightValue || {};
    byExposure.byLightValue[lightValue] =
      byExposure.byLightValue[lightValue] || 0;
    byExposure.byLightValue[lightValue]++;
  }
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

  const cameraLens = lens ? `${camera} + ${lens}` : camera;
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
