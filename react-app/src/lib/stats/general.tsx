/* eslint-disable @typescript-eslint/no-explicit-any */
import FlagIcon from "../../components/FlagIcon";
import format from "../format";
import collection from "../collection";
import type { Photo } from "../../models/PhotoModel";
import type { StatsContext } from "./context";
import { countDistinctNonZero, dateDiff, detectPeakShape, mean, StatsCategory, stddev, SummaryExtras, UNKNOWN } from "./shared";

// The "general" topic of the statistics view. Bodies are bound to one
// `collectTopics` call through the context.
export const buildGeneralTopic = (context: StatsContext) => {
  const {
    data,
    lang,
    t,
    countryData,
    mapPhotos,
    hideMap,
    betaEnabled,
    onRequestMapPhotos,
    onCloseMapPhotos,
    formatNumber,
    localizeUnknownKey,
    encodeTableKey,
    chartOptions,
    transformData,
    calculateStatistics,
  } = context;

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

  return collectGeneral();
};
