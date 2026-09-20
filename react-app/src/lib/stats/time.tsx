/* eslint-disable @typescript-eslint/no-explicit-any */
import format from "../format";
import collection from "../collection";
import color from "../color";
import config from "../config";
import type { StatsContext } from "./context";
import { mean, stddev } from "./shared";

// The "time" topic of the statistics view. Bodies are bound to one
// `collectTopics` call through the context.
export const buildTimeTopic = (context: StatsContext) => {
  const {
    data,
    t,
    theme,
    formatNumber,
    encodeTableKey,
    chartOptions,
    mapToChartData,
    transformData,
    calculateStatistics,
  } = context;

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

  return collectTime();
};
