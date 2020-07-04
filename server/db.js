
// TODO: this stuff should be coming from a DB
// TODO: all galleries from DB
const dummyGalleries = {
    "gallery1": {
        id: "gallery1",
        title: "gallery 1",
        description: "",
    },
    "gallery2": {
        id: "gallery2",
        title: "gallery 2",
        description: "",
    },
};
// TODO: all photos in DB
const dummyPhotos = {
    "somephoto.jpg": {
        id: "somephoto.jpg",
        title: "",
        description: "",
        taken: { timestamp: "2019-05-04 13:13:03", year: 2019, month: 5, day: 4, country: "jp", place: "", },
        author: "Ville Misaki",
        camera: { make: 'FUJIFILM', model: 'X-T2', serial: '62054072' },
        lens: { make: 'FUJIFILM', model: 'XF27mmF2.8', serial: '44A07244' },
        exposure: { focalLength: 27, focalLength35mmEquiv: 41, aperture: 5.6, shutterSpeed: '1/744', iso: 200 },
        size: {
            original: { width: 6000, height: 4000 }, display: { width: 1500, height: 1000 }, thumbnail: { width: 150, height: 100 },
        },
    },
    "somephoto2.jpg": {
        id: "somephoto2.jpg",
        title: "",
        description: "",
        taken: { timestamp: "2020-07-04 14:13:03", year: 2020, month: 7, day: 4, country: "jp", place: "", },
        author: "Ville Misaki",
        camera: { make: 'FUJIFILM', model: 'X-T2', serial: '62054072' },
        lens: { make: 'FUJIFILM', model: 'XF27mmF2.8', serial: '44A07244' },
        exposure: { focalLength: 27, focalLength35mmEquiv: 41, aperture: 5.6, shutterSpeed: '1/744', iso: 200 },
        size: {
            original: { width: 6000, height: 4000 }, display: { width: 1500, height: 1000 }, thumbnail: { width: 150, height: 100 },
        },
    },
};
// link between gallery and photo
const dummyGalleryPhotos = {
    "gallery1": [
        "somephoto.jpg",
        "somephoto2.jpg",
    ],
};

module.exports = {

    loadGalleries: () => Object.values(dummyGalleries).sort((a, b) => a.id.localeCompare(b.id)),
    loadGallery: (name) => {
        const map = {};
        // TODO: join in DB => list of photo meta, in order
        const galleryPhotos = dummyGalleryPhotos[name]
            .map(photoName => dummyPhotos[photoName]);
        galleryPhotos
            .forEach(photo => {
                if (!(photo.taken.year in map)) {
                    map[photo.taken.year] = {};
                }
                const yearMap = map[photo.taken.year];
                if (!(photo.taken.month in yearMap)) {
                    yearMap[photo.taken.month] = {};
                }
                const monthMap = yearMap[photo.taken.month];
                if (!(photo.taken.day in monthMap)) {
                    monthMap[photo.taken.day] = [];
                }
                const dayPhotos = monthMap[photo.taken.day];
                // TODO: reduce meta for this
                dayPhotos.push(photo);
            });
        const gallery = {
            ...dummyGalleries[name],
            photos: map,
        };
        return gallery;
    },
    loadPhotos: () => dummyPhotos,
    loadPhoto: (name) => dummyPhotos[name],

};