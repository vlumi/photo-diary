const CONST = require("../utils/constants");

/**
 * Dummy DB, with all DB values hard-coded.
 */
module.exports = () => {
  return {
    init,
    loadUserAccessControl,
    loadUser,
    loadGalleries,
    loadGallery,
    loadGalleryPhotos,
    loadGalleryPhoto,
    loadPhotos,
    loadPhoto,
  };
};

let db = undefined;
const init = () => {
  db = JSON.parse(dbDump);
};

const loadUserAccessControl = async (username) => {
  if (!(username in db.accessControl)) {
    throw CONST.ERROR_NOT_FOUND;
  }
  return db.accessControl[username];
};
const loadUser = async (username) => {
  if (!(username in db.users)) {
    throw CONST.ERROR_NOT_FOUND;
  }
  return db.users[username];
};
// TODO: something like this for create/update user to hash the password:
// {
//   const saltRounds = 10;
//   bcrypt.hash(password, saltRounds, function (err, hash) {
//     db.users["admin"].password = hash;
//   });
// }
const loadGalleries = async () => {
  return Object.values(db.galleries).sort();
};
const loadGallery = async (galleryId) => {
  if (!(galleryId in db.galleries)) {
    throw CONST.ERROR_NOT_FOUND;
  }
  return db.galleries[galleryId];
};
const loadGalleryPhotos = async (galleryId) => {
  switch (galleryId) {
    case CONST.SPECIAL_GALLERY_ALL:
      return Object.values(db.photos).sort();
    case CONST.SPECIAL_GALLERY_NONE: {
      const galleriesPhotos = Object.values(db.galleryPhotos).flat();
      const photos = Object.keys(db.photos)
        .filter((photoId) => !galleriesPhotos.includes(photoId))
        .map((photoId) => db.photos[photoId])
        .sort();
      return photos;
    }
    default: {
      if (!(galleryId in db.galleries)) {
        throw CONST.ERROR_NOT_FOUND;
      }
      const photos = db.galleryPhotos[galleryId].map(
        (photoId) => db.photos[photoId]
      );
      return photos;
    }
  }
};
const loadGalleryPhoto = async (galleryId, photoId) => {
  const handleGalleryAll = async () => {
    return await loadPhoto(photoId);
  };
  const handleGalleryNone = async () => {
    const galleriesPhotos = Object.values(db.galleryPhotos).flat();
    const photos = Object.keys(db.photos)
      .filter((id) => id === photoId)
      .filter((id) => !galleriesPhotos.includes(id))
      .map((id) => db.photos[id])
      .sort();
    if (photos.length === 0) {
      throw CONST.ERROR_NOT_FOUND;
    }
    return photos[0];
  };
  const handleGallery = async () => {
    if (!(galleryId in db.galleries)) {
      throw CONST.ERROR_NOT_FOUND;
    }
    const photos = db.galleryPhotos[galleryId]
      .filter((id) => id === photoId)
      .map((id) => db.photos[id]);
    if (photos.length === 0) {
      throw CONST.ERROR_NOT_FOUND;
    }
    return photos[0];
  };

  switch (galleryId) {
    case CONST.SPECIAL_GALLERY_ALL:
      return await handleGalleryAll();
    case CONST.SPECIAL_GALLERY_NONE:
      return await handleGalleryNone();
    default:
      return await handleGallery();
  }
};
const loadPhotos = async () => {
  return db.photos;
};
const loadPhoto = async (photoId) => {
  if (!(photoId in db.photos)) {
    throw CONST.ERROR_NOT_FOUND;
  }
  return db.photos[photoId];
};

const dbDump = JSON.stringify({
  users: {
    admin: {
      password: "$2b$10$7edID90/TmAdhGtJRqjDj.hBzXEJZorgDYZ9jwPcdDdqceYlaQ2ZG",
    },
    gallery1Admin: {
      password: "$2b$10$7edID90/TmAdhGtJRqjDj.hBzXEJZorgDYZ9jwPcdDdqceYlaQ2ZG",
    },
    gallery2Admin: {
      password: "$2b$10$7edID90/TmAdhGtJRqjDj.hBzXEJZorgDYZ9jwPcdDdqceYlaQ2ZG",
    },
    gallery1User: {
      password: "$2b$10$7edID90/TmAdhGtJRqjDj.hBzXEJZorgDYZ9jwPcdDdqceYlaQ2ZG",
    },
    gallery12User: {
      password: "$2b$10$7edID90/TmAdhGtJRqjDj.hBzXEJZorgDYZ9jwPcdDdqceYlaQ2ZG",
    },
    plainUser: {
      password: "$2b$10$7edID90/TmAdhGtJRqjDj.hBzXEJZorgDYZ9jwPcdDdqceYlaQ2ZG",
    },
    simpleUser: {
      password: "$2b$10$7edID90/TmAdhGtJRqjDj.hBzXEJZorgDYZ9jwPcdDdqceYlaQ2ZG",
    },
    blockedUser: {
      password: "$2b$10$7edID90/TmAdhGtJRqjDj.hBzXEJZorgDYZ9jwPcdDdqceYlaQ2ZG",
    },
  },
  accessControl: {
    admin: {
      [CONST.SPECIAL_GALLERY_ALL]: CONST.ACCESS_ADMIN,
    },
    gallery1Admin: {
      [CONST.SPECIAL_GALLERY_ALL]: CONST.ACCESS_VIEW,
      gallery1: CONST.ACCESS_ADMIN,
    },
    gallery2Admin: {
      gallery2: CONST.ACCESS_ADMIN,
    },
    gallery1User: {
      gallery1: CONST.ACCESS_VIEW,
    },
    gallery12User: {
      gallery1: CONST.ACCESS_VIEW,
      gallery2: CONST.ACCESS_VIEW,
      gallery3: CONST.ACCESS_NONE,
    },
    plainUser: {
      [CONST.SPECIAL_GALLERY_ALL]: CONST.ACCESS_VIEW,
    },
    simpleUser: {},
    blockedUser: {
      [CONST.SPECIAL_GALLERY_ALL]: CONST.ACCESS_NONE,
    },
    guest: {
      gallery3: CONST.ACCESS_VIEW,
    },
  },
  galleries: {
    gallery1: {
      id: "gallery1",
      title: "gallery 1",
      description: "This is the first gallery",
    },
    gallery2: {
      id: "gallery2",
      title: "gallery 2",
      description: "This is the second gallery",
    },
    gallery3: {
      id: "gallery3",
      title: "gallery 3",
      description: "This is the third gallery",
    },
  },
  photos: {
    "gallery1photo.jpg": {
      id: "gallery1photo.jpg",
      title: "",
      description: "",
      taken: {
        instant: {
          timestamp: "2018-05-04 13:13:03",
          year: 2018,
          month: 5,
          day: 4,
          hour: 13,
          minute: 13,
          second: 3,
        },
        author: "Ville Misaki",
        location: {
          country: "jp",
          place: "",
          coordinates: {
            latitude: undefined,
            longitude: undefined,
            altitude: undefined,
          },
        },
      },
      camera: { make: "FUJIFILM", model: "X-T2", serial: "123" },
      lens: { make: "FUJIFILM", model: "XF27mmF2.8", serial: "456" },
      exposure: {
        focalLength: 27,
        focalLength35mmEquiv: 41,
        aperture: 5.6,
        exposureTime: 0.0008,
        iso: 200,
      },
      dimensions: {
        original: { width: 6000, height: 4000 },
        display: { width: 1500, height: 1000 },
        thumbnail: { width: 150, height: 100 },
      },
    },
    "gallery12photo.jpg": {
      id: "gallery12photo.jpg",
      title: "",
      description: "",
      taken: {
        instant: {
          timestamp: "2020-07-04 14:13:03",
          year: 2020,
          month: 7,
          day: 4,
          hour: 14,
          minute: 13,
          second: 3,
        },
        author: "Ville Misaki",
        location: {
          country: "nl",
          place: "",
          coordinates: {
            latitude: undefined,
            longitude: undefined,
            altitude: undefined,
          },
        },
      },
      camera: { make: "Panasonic", model: "DMC-GX7", serial: undefined },
      lens: {
        make: undefined,
        model: "LUMIX G 20/F1.7 II",
        serial: "04JG3165007",
      },
      exposure: {
        focalLength: 20,
        focalLength35mmEquiv: 40,
        aperture: 1.7,
        exposureTime: 0.0006666666666666666,
        iso: 200,
      },
      dimensions: {
        original: { width: 6000, height: 4000 },
        display: { width: 1500, height: 1000 },
        thumbnail: { width: 150, height: 100 },
      },
    },
    "gallery2photo.jpg": {
      id: "gallery2photo.jpg",
      title: "",
      description: "",
      taken: {
        instant: {
          timestamp: "2020-07-05 14:13:03",
          year: 2020,
          month: 7,
          day: 5,
          hour: 14,
          minute: 13,
          second: 3,
        },
        author: "Ville Misaki",
        location: {
          country: "jp",
          place: "",
          coordinates: {
            latitude: undefined,
            longitude: undefined,
            altitude: undefined,
          },
        },
      },
      camera: { make: "FUJIFILM", model: "X-T2", serial: "111" },
      lens: { make: "FUJIFILM", model: "XF27mmF2.8", serial: "222" },
      exposure: {
        focalLength: 27,
        focalLength35mmEquiv: 41,
        aperture: 5.6,
        exposureTime: 0.0008,
        iso: 200,
      },
      dimensions: {
        original: { width: 6000, height: 4000 },
        display: { width: 1500, height: 1000 },
        thumbnail: { width: 150, height: 100 },
      },
    },
    "gallery3photo.jpg": {
      id: "gallery3photo.jpg",
      title: "",
      description: "",
      taken: {
        instant: {
          timestamp: "2020-07-05 14:13:03",
          year: 2020,
          month: 7,
          day: 6,
          hour: 14,
          minute: 13,
          second: 3,
        },
        author: "Ville Misaki",
        location: {
          country: "jp",
          place: "",
          coordinates: {
            latitude: undefined,
            longitude: undefined,
            altitude: undefined,
          },
        },
      },
      camera: { make: "FUJIFILM", model: "X-T2", serial: "111" },
      lens: { make: "FUJIFILM", model: "XF27mmF2.8", serial: "222" },
      exposure: {
        focalLength: 27,
        focalLength35mmEquiv: 41,
        aperture: 5.6,
        exposureTime: 0.0008,
        iso: 200,
      },
      dimensions: {
        original: { width: 6000, height: 4000 },
        display: { width: 1500, height: 1000 },
        thumbnail: { width: 150, height: 100 },
      },
    },
    "orphanphoto.jpg": {
      id: "orphanphoto.jpg",
      title: "",
      description: "",
      taken: {
        instant: {
          timestamp: "2020-08-05 14:13:03",
          year: 2020,
          month: 8,
          day: 5,
          hour: 14,
          minute: 13,
          second: 3,
        },
        author: "Ville Misaki",
        location: {
          country: "fi",
          place: "",
          coordinates: {
            latitude: undefined,
            longitude: undefined,
            altitude: undefined,
          },
        },
      },
      camera: { make: "FUJIFILM", model: "X100F", serial: "123456" },
      lens: { make: undefined, model: undefined, serial: undefined },
      exposure: {
        focalLength: 23,
        focalLength35mmEquiv: undefined,
        aperture: 5.6,
        exposureTime: 0.0005263157894736842,
        iso: 200,
      },
      dimensions: { width: 6000, height: 4000 },
    },
  },
  galleryPhotos: {
    gallery1: ["gallery1photo.jpg", "gallery12photo.jpg"],
    gallery2: ["gallery12photo.jpg", "gallery2photo.jpg"],
    gallery3: ["gallery3photo.jpg"],
  },
});
init();
