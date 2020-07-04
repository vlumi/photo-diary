const CONST = require("./constants");

module.exports = (db) => {
    return {
        getStatistics: () => collectStatistics(db),

        getAllGalleries: () => db.loadGalleries()
            .filter(gallery => !gallery.id.startsWith(":")),
        createGallery: () => { throw CONST.ERROR_NOT_IMPLEMENTED; },
        getGallery: (gallery) => {
            const galleryPhotos = db.loadGalleryPhotos(gallery);
            const map = groupPhotosByYearMonthDay(galleryPhotos);
            return {
                ...db.loadGallery(gallery),
                photos: map,
            };
        },
        updateGallery: (gallery) => { throw CONST.ERROR_NOT_IMPLEMENTED; },
        deleteGallery: () => { throw CONST.ERROR_NOT_IMPLEMENTED; },
        linkPhoto: (photo, gallery) => { throw CONST.ERROR_NOT_IMPLEMENTED; },
        unlinkPhoto: (photo, gallery) => { throw CONST.ERROR_NOT_IMPLEMENTED; },

        getAllPhotos: () => db.loadPhotos(),
        createPhoto: () => { throw CONST.ERROR_NOT_IMPLEMENTED; },
        getPhoto: (photo) => db.loadPhoto(photo),
        updatePhoto: () => { throw CONST.ERROR_NOT_IMPLEMENTED; },
        deletePhoto: () => { throw CONST.ERROR_NOT_IMPLEMENTED; },
    }
};

const collectStatistics = (db) => {
    const stats = {
        galleries: db.loadGalleries(),
        photos: 0,
        distribution: {
            byTime: {
                byYear: {},
                byYearMonth: {},
                byMonthOfYear: {},
                byDayOfWeek: {},
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
    const updateTimeDistribution = (timeDistr, year, month, day) => {
        const dow = new Date(year, month, day).getDay();

        timeDistr.byYear[year] = timeDistr.byYear[year] || 0;
        timeDistr.byYearMonth[year] = timeDistr.byYearMonth[year] || {};
        timeDistr.byYearMonth[year][month] = timeDistr.byYearMonth[year][month] || 0;
        timeDistr.byMonthOfYear[month] = timeDistr.byMonthOfYear[month] || 0;
        timeDistr.byDayOfWeek[dow] = timeDistr.byDayOfWeek[dow] || 0;

        timeDistr.byYear[year]++;
        timeDistr.byYearMonth[year][month]++;
        timeDistr.byMonthOfYear[month]++;
        timeDistr.byDayOfWeek[dow]++;
    };
    const updateExposureDistribution = (expDistr, photo) => {
        const focalLength = photo.exposure.focalLength;
        const aperture = photo.exposure.aperture;
        const shutterSpeed = photo.exposure.shutterSpeed;
        const iso = photo.exposure.iso;

        expDistr.byFocalLength[focalLength] = expDistr.byFocalLength[focalLength] || 0;
        expDistr.byAperture[aperture] = expDistr.byAperture[aperture] || 0;
        expDistr.byShutterSpeed[shutterSpeed] = expDistr.byShutterSpeed[shutterSpeed] || 0;
        expDistr.byIso[iso] = expDistr.byIso[iso] || 0;

        expDistr.byFocalLength[focalLength]++;
        expDistr.byAperture[aperture]++;
        expDistr.byShutterSpeed[shutterSpeed]++;
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
            return model;
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

    Object.values(db.loadPhotos()).forEach(photo => {
        stats.photos++;

        stats.distribution.byCountry[photo.taken.country] = stats.distribution.byCountry[photo.taken.country] || 0;
        stats.distribution.byCountry[photo.taken.country]++;

        stats.distribution.byAuthor[photo.taken.author] = stats.distribution.byAuthor[photo.taken.author] || 0;
        stats.distribution.byAuthor[photo.taken.author]++;

        updateTimeDistribution(
            stats.distribution.byTime,
            photo.taken.year,
            photo.taken.month,
            photo.taken.day
        );
        updateExposureDistribution(
            stats.distribution.byExposure,
            photo
        );
        updateGear(
            stats.distribution.byGear,
            photo
        );
    });
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
