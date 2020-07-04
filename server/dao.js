const db = require('./dummydb');

module.exports = {
    getStatistics: () => { throw "Not implemented"; },

    getAllGalleries: () => db.loadGalleries()
        .filter(gallery => !gallery.id.startsWith(":"))        ,
    createGallery: () => { throw "Not implemented"; },
    getGallery: (gallery) => {
        const galleryPhotos = db.loadGalleryPhotos(gallery);
        const map = groupPhotosByYearMonthDay(galleryPhotos);
        return {
            ...db.loadGallery(gallery),
            photos: map,
        };
    },
    updateGallery: (gallery) => { throw "Not implemented"; },
    deleteGallery: () => { throw "Not implemented"; },
    linkPhoto: (photo, gallery) => { throw "Not implemented"; },
    unlinkPhoto: (photo, gallery) => { throw "Not implemented"; },

    getAllPhotos: () => db.loadPhotos(),
    createPhoto: () => { throw "Not implemented"; },
    getPhoto: (photo) => db.loadPhoto(photo),
    updatePhoto: () => { throw "Not implemented"; },
    deletePhoto: () => { throw "Not implemented"; },
};

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

const groupPhotosByYearMonthDay = (galleryPhotos) => {
    const map = {};
    galleryPhotos
        .forEach(photo => {
            const yearMap =
                map[photo.taken.year] = map[photo.taken.year] || {};
            const monthMap =
                yearMap[photo.taken.month] = yearMap[photo.taken.month] || {};
            const dayPhotos =
                monthMap[photo.taken.day] = monthMap[photo.taken.day] || [];
            // TODO: reduce meta for this?
            // dayPhotos.push(reducePhotoForList(photo));
            dayPhotos.push(photo);
        });
    return map;
}
