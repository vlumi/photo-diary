const CONST = require("./constants");

module.exports = (db) => {
    return {
        getStatistics: (onSuccess, onError) => {
            db.loadGalleries(galleries => {
                db.loadPhotos(photos => {
                    onSuccess(collectStatistics(galleries, Object.values(photos)));
                }, onError);
            }, onError);
        },
        getGalleryStatistics: (gallery, onSuccess, onError) => {
            db.loadGalleryPhotos(gallery, photos => {
                onSuccess(collectGalleryStatistics(photos));
            }, onError);
        },

        getAllGalleries: (onSuccess, onError) => db.loadGalleries(
            data => {
                onSuccess(
                    data.filter(gallery => !gallery.id.startsWith(":"))
                )
            },
            onError
        ),
        createGallery: () => { throw CONST.ERROR_NOT_IMPLEMENTED; },
        getGallery: (gallery, onSuccess, onError) => {
            db.loadGallery(gallery, (data) => {
                db.loadGalleryPhotos(gallery, (galleryPhotos) => {
                    const photosByYearMonthDay = groupPhotosByYearMonthDay(galleryPhotos);
                    onSuccess({
                        ...data,
                        photos: photosByYearMonthDay,
                    });
                }), onError;
            }, onError);
        },
        updateGallery: (gallery) => { throw CONST.ERROR_NOT_IMPLEMENTED; },
        deleteGallery: () => { throw CONST.ERROR_NOT_IMPLEMENTED; },
        linkPhoto: (photo, gallery) => { throw CONST.ERROR_NOT_IMPLEMENTED; },
        unlinkPhoto: (photo, gallery) => { throw CONST.ERROR_NOT_IMPLEMENTED; },

        getAllPhotos: (onSuccess, onError) => db.loadPhotos(onSuccess, onError),
        createPhoto: () => { throw CONST.ERROR_NOT_IMPLEMENTED; },
        getPhoto: (photo, onSuccess, onError) => db.loadPhoto(photo, onSuccess, onError),
        updatePhoto: () => { throw CONST.ERROR_NOT_IMPLEMENTED; },
        deletePhoto: () => { throw CONST.ERROR_NOT_IMPLEMENTED; },
    }
};
const populateStatistics = (photos, stats) => {
    const updateTimeDistribution = (timeDistr, year, month, day, hour) => {
        const canonDate = (ymd) => ymd.year * 10000 + ymd.month * 100 + ymd.day;
        if (timeDistr.minDate === undefined || canonDate({ year, month, day }) < canonDate(timeDistr.minDate)) {
            timeDistr.minDate = {
                year: year,
                month: month,
                day: day,
            };
        }
        if (timeDistr.maxDate === undefined || canonDate({ year, month, day }) > canonDate(timeDistr.maxDate)) {
            timeDistr.maxDate = {
                year: year,
                month: month,
                day: day,
            };
        }

        timeDistr.byYear[year] = timeDistr.byYear[year] || 0;
        timeDistr.byYear[year]++;

        timeDistr.byYearMonth[year] = timeDistr.byYearMonth[year] || {};
        timeDistr.byYearMonth[year][month] = timeDistr.byYearMonth[year][month] || 0;
        timeDistr.byYearMonth[year][month]++;

        timeDistr.byMonthOfYear[month] = timeDistr.byMonthOfYear[month] || 0;
        timeDistr.byMonthOfYear[month]++;

        const dow = new Date(year, month - 1, day).getDay();
        timeDistr.byDayOfWeek[dow] = timeDistr.byDayOfWeek[dow] || 0;
        timeDistr.byDayOfWeek[dow]++;

        timeDistr.byHourOfDay[hour] = timeDistr.byHourOfDay[hour] || 0;
        timeDistr.byHourOfDay[hour]++;

    };
    const updateExposureDistribution = (expDistr, photo) => {
        const focalLength = photo.exposure.focalLength || CONST.STATS_UNKNOWN;
        expDistr.byFocalLength[focalLength] = expDistr.byFocalLength[focalLength] || 0;
        expDistr.byFocalLength[focalLength]++;

        const aperture = photo.exposure.aperture || CONST.STATS_UNKNOWN;
        expDistr.byAperture[aperture] = expDistr.byAperture[aperture] || 0;
        expDistr.byAperture[aperture]++;

        const shutterSpeed = photo.exposure.shutterSpeed || CONST.STATS_UNKNOWN;
        expDistr.byShutterSpeed[shutterSpeed] = expDistr.byShutterSpeed[shutterSpeed] || 0;
        expDistr.byShutterSpeed[shutterSpeed]++;

        const iso = photo.exposure.iso || CONST.STATS_UNKNOWN;
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

        const camera = buildName(photo.camera.make, photo.camera.model);
        const lens = buildName(photo.lens.make, photo.lens.model);
        if (camera) {
            gear.byCamera[camera] = gear.byCamera[camera] || 0;
            gear.byCamera[camera]++;
        }
        if (lens) {
            gear.byLens[lens] = gear.byLens[lens] || 0;
            gear.byLens[lens]++;
        }
        if (camera && lens) {
            gear.byCameraAndLens[camera] = gear.byCameraAndLens[camera] || {};
            gear.byCameraAndLens[camera][lens] = gear.byCameraAndLens[camera][lens] || 0;
            gear.byCameraAndLens[camera][lens]++;
        }
    };

    photos.forEach(photo => {
        stats.count.photos++;

        stats.count.byCountry[photo.taken.country] = stats.count.byCountry[photo.taken.country] || 0;
        stats.count.byCountry[photo.taken.country]++;

        stats.count.byAuthor[photo.taken.author] = stats.count.byAuthor[photo.taken.author] || 0;
        stats.count.byAuthor[photo.taken.author]++;

        updateTimeDistribution(
            stats.count.byTime,
            photo.taken.year,
            photo.taken.month,
            photo.taken.day,
            photo.taken.hour
        );
        updateExposureDistribution(
            stats.count.byExposure,
            photo
        );
        updateGear(
            stats.count.byGear,
            photo
        );
    });
}

const fillTimeDistributionGaps = (timeDistr) => {
    const isLeap = (year) => year % 4 == 0 && (year % 100 != 0 || year % 400 == 0);
    const MONTH_LENGTH = {
        true: [0, 31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31],
        false: [0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31],
    };

    for (let m = 1; m <= 12; m++) {
        timeDistr.byMonthOfYear[m] = timeDistr.byMonthOfYear[m] || 0;
    }
    for (let dow = 0; dow < 7; dow++) {
        timeDistr.byDayOfWeek[dow] = timeDistr.byDayOfWeek[dow] || 0;
    }
    for (let h = 0; h < 24; h++) {
        timeDistr.byHourOfDay[h] = timeDistr.byHourOfDay[h] || 0;
    }

    if (timeDistr.minDate && timeDistr.maxDate) {
        const minYear = timeDistr.minDate.year;
        const maxYear = timeDistr.maxDate.year;
        timeDistr.daysInYear[minYear] = 0;
        timeDistr.daysInYearMonth[minYear] = {};
        for (let m = timeDistr.minDate.month; m <= 12; m++) {
            timeDistr.byYearMonth[minYear][m] = timeDistr.byYearMonth[minYear][m] || 0;
            if (m == timeDistr.minDate.month) {
                timeDistr.daysInYear[minYear] +=
                    timeDistr.daysInYearMonth[minYear][m] = MONTH_LENGTH[isLeap(minYear)][m] - timeDistr.minDate.day + 1;

            } else {
                timeDistr.daysInYear[minYear] +=
                    timeDistr.daysInYearMonth[minYear][m] = MONTH_LENGTH[isLeap(minYear)][m];
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
        for (let m = 1; m <= timeDistr.maxDate.month; m++) {
            timeDistr.byYearMonth[maxYear][m] = timeDistr.byYearMonth[maxYear][m] || 0;
            if (m == timeDistr.maxDate.month) {
                timeDistr.daysInYear[maxYear] +=
                    timeDistr.daysInYearMonth[maxYear][m] = timeDistr.maxDate.day;
            } else {
                timeDistr.daysInYear[maxYear] +=
                    timeDistr.daysInYearMonth[maxYear][m] = MONTH_LENGTH[isLeap(maxYear)][m];
            }
        }
    }
};

const collectStatistics = (galleries, photos) => {
    const stats = {
        galleries: galleries,
        count: {
            photos: 0,
            days: 0,
            byTime: {
                minDate: undefined,
                maxDate: undefined,
                byYear: {},
                daysInYear: {},
                byYearMonth: {},
                daysInYearMonth: {},
                byMonthOfYear: {},
                byDayOfWeek: {},
                byHourOfDay: {},
            },
            byExposure: {
                byFocalLength: {},
                byAperture: {},
                byShutterSpeed: {},
                byIso: {},
            },
            byGear: {
                byCamera: {},
                byLens: {},
                byCameraAndLens: {},
            },
            byAuthor: {},
            byCountry: {},
        },
    };

    populateStatistics(photos, stats);
    fillTimeDistributionGaps(stats.count.byTime);
    stats.count.days = Object.values(stats.count.byTime.daysInYear).reduce((a, b) => a + b, 0);
    return stats;
}
const collectGalleryStatistics = (photos) => {
    const stats = {
        count: {
            photos: 0,
            days: 0,
            byTime: {
                minDate: undefined,
                maxDate: undefined,
                byYear: {},
                daysInYear: {},
                byYearMonth: {},
                daysInYearMonth: {},
                byMonthOfYear: {},
                byDayOfWeek: {},
                byHourOfDay: {},
            },
            byExposure: {
                byFocalLength: {},
                byAperture: {},
                byShutterSpeed: {},
                byIso: {},
            },
            byGear: {
                byCamera: {},
                byLens: {},
                byCameraAndLens: {},
            },
            byAuthor: {},
            byCountry: {},
        },
    };

    populateStatistics(photos, stats);
    fillTimeDistributionGaps(stats.count.byTime);
    console.log(stats);
    stats.count.days = Object.values(stats.count.byTime.daysInYear).reduce((a, b) => a + b, 0);
    return stats;
}

const groupPhotosByYearMonthDay = (galleryPhotos) => {
    const reducePhotoForList = (photo) => {
        return {
            id: photo.id,
            title: photo.title,
            taken: {
                country: photo.taken.country,
            },
            author: photo.author,
            size: {
                thumbnail: photo.size.thumbnail,
            },
        };
    };

    const photosByDate = {};
    galleryPhotos
        .forEach(photo => {
            const yearMap =
                photosByDate[photo.taken.year] = photosByDate[photo.taken.year] || {};
            const monthMap =
                yearMap[photo.taken.month] = yearMap[photo.taken.month] || {};
            const dayPhotos =
                monthMap[photo.taken.day] = monthMap[photo.taken.day] || [];
            // TODO: reduce meta for this?
            // dayPhotos.push(reducePhotoForList(photo));
            dayPhotos.push(photo);
        });
    return photosByDate;
}

