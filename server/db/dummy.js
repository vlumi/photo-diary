/**
 * Dummy DB, with all DB values hard-coded.
 */
module.exports = {
    loadGalleries: () => Object.values(dummyGalleries).sort(),
    loadGallery: (name) => {
        if (name in dummyGalleries) {
            return dummyGalleries[name];
        }
        throw "Not found";
    },
    loadGalleryPhotos: (name) => {
        switch (name) {
            case ":all":
                return Object.values(dummyPhotos)
                    .sort();
            case ":none":
                const galleriesPhotos = Object.values(dummyGalleryPhotos).flat();
                return Object.keys(dummyPhotos)
                    .filter(photo => !galleriesPhotos.includes(photo))
                    .map(photoName => dummyPhotos[photoName])
                    .sort();
            default:
                if (name in dummyGalleries) {
                    return dummyGalleryPhotos[name]
                        .map(photoName => dummyPhotos[photoName]);
                }
                throw "Not found";
        }
    },
    loadPhotos: () => dummyPhotos,
    loadPhoto: (name) => dummyPhotos[name],
};

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
    ":all": {
        id: ":all",
        title: "All photos",
        description: "Contains all photos in the repository, regardless of galleries they have been linked to.",
    },
    ":none": {
        id: ":none",
        title: "Photos not in galleries",
        description: "Contains all photos that have not been linked to any galleries.",
    }
};
const dummyPhotos = {
    "somephoto.jpg": {
        id: "somephoto.jpg",
        title: "",
        description: "",
        taken: { timestamp: "2019-05-04 13:13:03", year: 2019, month: 5, day: 4, hour: 13, minute: 13, second: 3, country: "jp", place: "", author: "Ville Misaki", },
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
        taken: { timestamp: "2020-07-04 14:13:03", year: 2020, month: 7, day: 4, hour: 14, minute: 13, second: 3, country: "nl", place: "", author: "Ville Misaki", },
        camera: { make: 'Panasonic', model: 'DMC-GX7', serial: undefined },
        lens: { make: undefined, model: 'LUMIX G 20/F1.7 II', serial: '04JG3165007' },
        exposure: { focalLength: 20, focalLength35mmEquiv: 40, aperture: 1.7, shutterSpeed: '1/15', iso: 200 },
        size: {
            original: { width: 6000, height: 4000 }, display: { width: 1500, height: 1000 }, thumbnail: { width: 150, height: 100 },
        },
    },
    "somephoto3.jpg": {
        id: "somephoto3.jpg",
        title: "",
        description: "",
        taken: { timestamp: "2020-07-05 14:13:03", year: 2020, month: 7, day: 5, hour: 14, minute: 13, second: 3, country: "jp", place: "", author: "Ville Misaki", },
        camera: { make: 'FUJIFILM', model: 'X-T2', serial: '62054072' },
        lens: { make: 'FUJIFILM', model: 'XF27mmF2.8', serial: '44A07244' },
        exposure: { focalLength: 27, focalLength35mmEquiv: 41, aperture: 5.6, shutterSpeed: '1/744', iso: 200 },
        size: {
            original: { width: 6000, height: 4000 }, display: { width: 1500, height: 1000 }, thumbnail: { width: 150, height: 100 },
        },
    },
    "somephoto4.jpg": {
        id: "somephoto4.jpg",
        title: "",
        description: "",
        taken: { timestamp: "2020-08-05 14:13:03", year: 2020, month: 8, day: 5, hour: 14, minute: 13, second: 3, country: "fi", place: "", author: "Ville Misaki", },
        camera: { make: 'FUJIFILM', model: 'X100F', serial: '71001090' },
        lens: { make: undefined, model: undefined, serial: undefined },
        exposure: { focalLength: 23, focalLength35mmEquiv: undefined, aperture: 5.6, shutterSpeed: '1/133', iso: 200 },
        size: { width: 6000, height: 4000 }
    },
};
const dummyGalleryPhotos = {
    "gallery1": [
        "somephoto.jpg",
        "somephoto2.jpg",
    ],
    "gallery2": [
        "somephoto2.jpg",
        "somephoto3.jpg",
    ],
};
