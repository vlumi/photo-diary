const CONST = require("../constants");

const populateStatistics = (photos, stats) => {
  const updateTimeDistribution = (timeDistr, year, month, day, hour) => {
    const canonDate = (ymd) => ymd.year * 10000 + ymd.month * 100 + ymd.day;

    const canonYmd = canonDate({ year, month, day });
    const minDate = timeDistr.minDate || undefined;
    if (minDate === undefined || canonYmd < canonDate(minDate)) {
      timeDistr.minDate = {
        year: year,
        month: month,
        day: day,
      };
    }
    const maxDate = timeDistr.maxDate || undefined;

    if (maxDate === undefined || canonYmd > canonDate(timeDistr.maxDate)) {
      timeDistr.maxDate = {
        year: year,
        month: month,
        day: day,
      };
    }

    timeDistr.byYear = timeDistr.byYear || {};
    timeDistr.byYear[year] = timeDistr.byYear[year] || 0;
    timeDistr.byYear[year]++;

    timeDistr.byYearMonth = timeDistr.byYearMonth || {};
    timeDistr.byYearMonth[year] = timeDistr.byYearMonth[year] || {};
    timeDistr.byYearMonth[year][month] =
      timeDistr.byYearMonth[year][month] || 0;
    timeDistr.byYearMonth[year][month]++;

    timeDistr.byMonthOfYear = timeDistr.byMonthOfYear || {};
    timeDistr.byMonthOfYear[month] = timeDistr.byMonthOfYear[month] || 0;
    timeDistr.byMonthOfYear[month]++;

    const dow = new Date(year, month - 1, day).getDay();
    timeDistr.byDayOfWeek = timeDistr.byDayOfWeek || {};
    timeDistr.byDayOfWeek[dow] = timeDistr.byDayOfWeek[dow] || 0;
    timeDistr.byDayOfWeek[dow]++;

    timeDistr.byHourOfDay = timeDistr.byHourOfDay || {};
    timeDistr.byHourOfDay[hour] = timeDistr.byHourOfDay[hour] || 0;
    timeDistr.byHourOfDay[hour]++;

    fillTimeDistributionGaps(timeDistr);
  };
  const updateExposureDistribution = (expDistr, photo) => {
    const focalLength =
      photo.exposure.focalLength > 0
        ? photo.exposure.focalLength
        : CONST.STATS_UNKNOWN;
    expDistr.byFocalLength = expDistr.byFocalLength || {};
    expDistr.byFocalLength[focalLength] =
      expDistr.byFocalLength[focalLength] || 0;
    expDistr.byFocalLength[focalLength]++;

    const aperture = photo.exposure.aperture || CONST.STATS_UNKNOWN;
    expDistr.byAperture = expDistr.byAperture || {};
    expDistr.byAperture[aperture] = expDistr.byAperture[aperture] || 0;
    expDistr.byAperture[aperture]++;

    const shutterSpeed = photo.exposure.shutterSpeed || CONST.STATS_UNKNOWN;
    expDistr.byShutterSpeed = expDistr.byShutterSpeed || {};
    expDistr.byShutterSpeed[shutterSpeed] =
      expDistr.byShutterSpeed[shutterSpeed] || 0;
    expDistr.byShutterSpeed[shutterSpeed]++;

    const iso = photo.exposure.iso || CONST.STATS_UNKNOWN;
    expDistr.byIso = expDistr.byIso || {};
    expDistr.byIso[iso] = expDistr.byIso[iso] || 0;
    expDistr.byIso[iso]++;
  };
  const updateGear = (gear, photo) => {
    const buildName = (make, model) => {
      if (make && model) {
        return `${make} ${model}`;
      }
      if (make) {
        return make;
      }
      if (model) {
        return model;
      }
      return CONST.STATS_UNKNOWN;
    };

    const updateGearData = (root) => {
      root.total = root.total || 0;
      root.total++;
      root.byTime = root.byTime || {};
      updateTimeDistribution(
        root.byTime,
        photo.taken.year,
        photo.taken.month,
        photo.taken.day,
        photo.taken.hour
      );
      root.byExposure = root.byExposure || {};
      updateExposureDistribution(root.byExposure, photo);
    };

    const camera = buildName(photo.camera.make, photo.camera.model);
    const lens = buildName(photo.lens.make, photo.lens.model);
    if (camera) {
      gear.byCamera = gear.byCamera || {};
      gear.byCamera[camera] = gear.byCamera[camera] || {};
      updateGearData(gear.byCamera[camera]);
      if (lens && lens !== CONST.STATS_UNKNOWN) {
        gear.byCamera[camera].byLens = gear.byCamera[camera].byLens || {};
        const byLens = gear.byCamera[camera].byLens;
        byLens[lens] = byLens[lens] || {};
        updateGearData(byLens[lens]);
      }
    }
    if (lens && lens !== CONST.STATS_UNKNOWN) {
      gear.byLens = gear.byLens || {};
      gear.byLens[lens] = gear.byLens[lens] || {};
      updateGearData(gear.byLens[lens]);
    }
  };

  photos.forEach((photo) => {
    stats.count.total++;

    stats.count.byCountry[photo.taken.country] =
      stats.count.byCountry[photo.taken.country] || 0;
    stats.count.byCountry[photo.taken.country]++;

    stats.count.byAuthor[photo.taken.author] =
      stats.count.byAuthor[photo.taken.author] || 0;
    stats.count.byAuthor[photo.taken.author]++;

    updateTimeDistribution(
      stats.count.byTime,
      photo.taken.year,
      photo.taken.month,
      photo.taken.day,
      photo.taken.hour
    );
    updateExposureDistribution(stats.count.byExposure, photo);
    updateGear(stats.count.byGear, photo);
  });
};

const fillTimeDistributionGaps = (timeDistr) => {
  const isLeap = (year) =>
    year % 4 == 0 && (year % 100 != 0 || year % 400 == 0);
  const MONTH_LENGTH = {
    true: [0, 31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31],
    false: [0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31],
  };

  if (timeDistr.minDate && timeDistr.maxDate) {
    const minYear = timeDistr.minDate.year;
    const maxYear = timeDistr.maxDate.year;
    timeDistr.daysInYear = timeDistr.daysInYear || {};
    timeDistr.daysInYear[minYear] = 0;
    timeDistr.daysInYearMonth = timeDistr.daysInYearMonth || {};
    timeDistr.daysInYearMonth[minYear] = {};

    const maxMonth = minYear === maxYear ? timeDistr.maxDate.month : 12;
    for (let m = timeDistr.minDate.month; m <= maxMonth; m++) {
      timeDistr.byYearMonth[minYear][m] =
        timeDistr.byYearMonth[minYear][m] || 0;
      if (minYear === maxYear && timeDistr.minDate.month === maxMonth) {
        timeDistr.daysInYear[minYear] += timeDistr.daysInYearMonth[minYear][m] =
          timeDistr.maxDate.day - timeDistr.minDate.day + 1;
      } else if (m == timeDistr.minDate.month) {
        timeDistr.daysInYear[minYear] += timeDistr.daysInYearMonth[minYear][m] =
          MONTH_LENGTH[isLeap(minYear)][m] - timeDistr.minDate.day + 1;
      } else {
        timeDistr.daysInYear[minYear] += timeDistr.daysInYearMonth[minYear][m] =
          MONTH_LENGTH[isLeap(minYear)][m];
      }
    }

    for (let y = minYear + 1; y < maxYear; y++) {
      const leap = isLeap(y);
      timeDistr.byYear[y] = timeDistr.byYear[y] || 0;
      timeDistr.daysInYear[y] = leap ? 366 : 365;

      timeDistr.byYearMonth[y] = timeDistr.byYearMonth[y] || {};
      timeDistr.daysInYearMonth[y] = {};
      for (let m = 1; m <= 12; m++) {
        timeDistr.byYearMonth[y][m] = timeDistr.byYearMonth[y][m] || 0;
        timeDistr.daysInYearMonth[y][m] = MONTH_LENGTH[leap][m];
      }
    }

    timeDistr.daysInYear[maxYear] = 0;
    timeDistr.daysInYearMonth[maxYear] = {};
    const minMonth = minYear === maxYear ? timeDistr.minDate.month : 1;
    for (let m = minMonth; m <= timeDistr.maxDate.month; m++) {
      timeDistr.byYearMonth[maxYear][m] =
        timeDistr.byYearMonth[maxYear][m] || 0;
      if (minYear === maxYear && minMonth === timeDistr.maxDate.month) {
        timeDistr.daysInYear[maxYear] += timeDistr.daysInYearMonth[maxYear][m] =
          timeDistr.maxDate.day - timeDistr.minDate.day + 1;
      } else if (m == timeDistr.maxDate.month) {
        timeDistr.daysInYear[maxYear] += timeDistr.daysInYearMonth[maxYear][m] =
          timeDistr.maxDate.day;
      } else {
        timeDistr.daysInYear[maxYear] += timeDistr.daysInYearMonth[maxYear][m] =
          MONTH_LENGTH[isLeap(maxYear)][m];
      }
    }
  }
  timeDistr.days = Object.values(timeDistr.daysInYear).reduce(
    (a, b) => a + b,
    0
  );
};

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

  populateStatistics(photos, stats);
  return stats;
};

module.exports = (db) => {
  const getStatistics = () => {
    return new Promise((resolve, reject) => {
      db.loadPhotos()
        .then((photos) => {
          resolve(collectStatistics(Object.values(photos)));
        })
        .catch((error) => reject(error));
    });
  };
  const getGalleryStatistics = (galleryId) => {
    return new Promise((resolve, reject) => {
      const loadGalleryPhotos = () =>
        db
          .loadGalleryPhotos(galleryId)
          .then((photos) => {
            resolve(collectStatistics(photos));
          })
          .catch((error) => reject(error));

      if (galleryId.startsWith(CONST.SPECIAL_GALLERY_PREFIX)) {
        loadGalleryPhotos();
      } else {
        db.loadGallery(galleryId)
          .then((gallery) => {
            loadGalleryPhotos();
          })
          .catch((error) => reject(error));
      }
    });
  };
  return {
    getStatistics,
    getGalleryStatistics,
  };
};
