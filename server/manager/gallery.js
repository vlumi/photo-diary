const CONST = require("../constants");

module.exports = (db) => {
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
    galleryPhotos.forEach((photo) => {
      const yearMap = (photosByDate[photo.taken.year] =
        photosByDate[photo.taken.year] || {});
      const monthMap = (yearMap[photo.taken.month] =
        yearMap[photo.taken.month] || {});
      const dayPhotos = (monthMap[photo.taken.day] =
        monthMap[photo.taken.day] || []);
      // TODO: reduce meta for this?
      // dayPhotos.push(reducePhotoForList(photo));
      dayPhotos.push(photo);
    });
    return photosByDate;
  };

  const getAllGalleries = (onSuccess, onError) => {
    db.loadGalleries((galleries) => {
      onSuccess([...galleries, ...Object.values(CONST.SPECIAL_GALLERIES)]);
    }, onError);
  };
  const createGallery = (gallery, onSuccess, onError) => {
    onError(CONST.ERROR_NOT_IMPLEMENTED);
  };
  const getGallery = (galleryId, onSuccess, onError) => {
    const loadGalleryPhotos = (gallery) => {
      db.loadGalleryPhotos(
        galleryId,
        (galleryPhotos) => {
          const photosByYearMonthDay = groupPhotosByYearMonthDay(galleryPhotos);
          onSuccess({
            ...gallery,
            photos: photosByYearMonthDay,
          });
        },
        onError
      );
    };
    if (galleryId.startsWith(CONST.SPECIAL_GALLERY_PREFIX)) {
      loadGalleryPhotos(CONST.SPECIAL_GALLERIES[galleryId]);
    } else {
      db.loadGallery(
        galleryId,
        (data) => {
          loadGalleryPhotos(data);
        },
        onError
      );
    }
  };
  const updateGallery = (gallery, onSuccess, onError) => {
    onError(CONST.ERROR_NOT_IMPLEMENTED);
  };
  const deleteGallery = () => {
    onError(CONST.ERROR_NOT_IMPLEMENTED);
  };

  return {
    getAllGalleries,
    createGallery,
    getGallery,
    updateGallery,
    deleteGallery,
  };
};