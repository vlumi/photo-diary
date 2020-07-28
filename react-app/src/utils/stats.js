import format from "./format";
import collection from "./collection";

const generate = async (gallery) => {
  return collectStatistics(gallery.photos());
};

const toHexRgb = ({ r, g, b }) =>
  "#" +
  format.padNumber(r.toString(16), 2) +
  format.padNumber(g.toString(16), 2) +
  format.padNumber(b.toString(16), 2);

const fromHexRgb = (hex) => {
  if (!hex.startsWith("#")) {
    return [0, 0, 0];
  }
  const rawValue = parseInt(hex.substr(1), 16);
  switch (hex.length) {
    case 4:
      return [
        (((rawValue >> 8) & 0xf) << 4) + ((rawValue >> 8) & 0xf),
        (((rawValue >> 4) & 0xf) << 4) + ((rawValue >> 4) & 0xf),
        ((rawValue & 0xf) << 4) + (rawValue & 0xf),
      ];
    case 7:
      return [(rawValue >> 16) & 0xff, (rawValue >> 8) & 0xff, rawValue & 0xff];
    default:
      return [0, 0, 0];
  }
};

const colorGradient = (start, end, steps) => {
  if (steps < 1) return [];
  if (steps < 2) return [start];
  if (steps < 3) return [start, end];

  const [r1, g1, b1] = fromHexRgb(start);
  const [r2, g2, b2] = fromHexRgb(end);

  const linearStep = (start, end, step, lastStep) =>
    end > start
      ? Math.round(start + ((end - start) * step) / lastStep)
      : Math.round(start - ((start - end) * step) / lastStep);

  return [...Array(steps).keys()]
    .map((step) => {
      return {
        r: linearStep(r1, r2, step, steps - 1),
        g: linearStep(g1, g2, step, steps - 1),
        b: linearStep(b1, b2, step, steps - 1),
      };
    })
    .map(toHexRgb);
};

export default { generate, colorGradient };

/**
 * Collect statistics from photos
 *
 * @param {array} photos The photos over which the statistics should be collected.
 * @return Distribution statistics of the given photos over various parameters and their combinations.
 */
const collectStatistics = (photos) => {
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

  populateDistributions(photos, stats);
  return stats;
};

/**
 * Populate the statistical distribution of the photos by several parameters.
 *
 * @param {array} photos The photos over which the statistics should be collected.
 * @param {object} stats The target structure for collecting statistics.
 */
const populateDistributions = (photos, stats) => {
  photos.forEach((photo) => {
    stats.count.total++;

    if (photo.hasCountry()) {
      const countryCode = photo.countryCode();
      stats.count.byCountry[countryCode] =
        stats.count.byCountry[countryCode] || 0;
      stats.count.byCountry[countryCode]++;
    }

    const author = photo.author();
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
        photo.focalLength() > 0 ? photo.focalLength() : undefined;
      const aperture = photo.aperture() || undefined;
      const exposureTime = photo.exposureTime() || undefined;
      const iso = photo.iso() || undefined;

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
const updateExposureDistribution = (byExposure, photo) => {
  const focalLength = Number(photo.focalLength()) || undefined;
  byExposure.byFocalLength = byExposure.byFocalLength || {};
  byExposure.byFocalLength[focalLength] =
    byExposure.byFocalLength[focalLength] || 0;
  byExposure.byFocalLength[focalLength]++;

  const aperture = Number(photo.aperture()) || undefined;
  byExposure.byAperture = byExposure.byAperture || {};
  byExposure.byAperture[aperture] = byExposure.byAperture[aperture] || 0;
  byExposure.byAperture[aperture]++;

  const exposureTime = Number(photo.exposureTime()) || undefined;
  byExposure.byExposureTime = byExposure.byExposureTime || {};
  byExposure.byExposureTime[exposureTime] =
    byExposure.byExposureTime[exposureTime] || 0;
  byExposure.byExposureTime[exposureTime]++;

  const iso = Number(photo.iso()) || undefined;
  byExposure.byIso = byExposure.byIso || {};
  byExposure.byIso[iso] = byExposure.byIso[iso] || 0;
  byExposure.byIso[iso]++;

  if (exposureTime) {
    // Round EV and LV to the closest half
    const roundEv = (value) => Math.round(value * 2) / 2;
    const fullExposureValue = Math.log2(aperture ** 2 / exposureTime);
    const exposureValue = roundEv(fullExposureValue) || undefined;
    byExposure.byExposureValue = byExposure.byExposureValue || {};
    byExposure.byExposureValue[exposureValue] =
      byExposure.byExposureValue[exposureValue] || 0;
    byExposure.byExposureValue[exposureValue]++;

    // LV = EV at ISO 100
    const fullLightValue = fullExposureValue + Math.log2(iso / 100);
    const lightValue = roundEv(fullLightValue) || undefined;
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
const updateGear = (byGear, photo) => {
  const cameraMake = photo.cameraMake();
  if (cameraMake) {
    byGear.byCameraMake = byGear.byCameraMake || {};
    byGear.byCameraMake[cameraMake] = byGear.byCameraMake[cameraMake] || 0;
    byGear.byCameraMake[cameraMake]++;
  }

  const camera = photo.formatCamera() || undefined;
  const lens = photo.formatLens() || undefined;
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
