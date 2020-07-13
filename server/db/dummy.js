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

const loadUserAccessControl = (username) => {
  return new Promise((resolve, reject) => {
    if (username in db.accessControl) {
      resolve(db.accessControl[username]);
    } else {
      reject(CONST.ERROR_NOT_FOUND);
    }
  });
};
const loadUser = (username) => {
  return new Promise((resolve, reject) => {
    if (username in db.users) {
      resolve(db.users[username]);
    } else {
      reject(CONST.ERROR_NOT_FOUND);
    }
  });
};
// TODO: something like this for create/update user to hash the password:
// const db.getUser = (username) => DUMMY_USERS[username];
// {
//   const saltRounds = 10;
//   bcrypt.hash(password, saltRounds, function (err, hash) {
//     DUMMY_USERS["admin"].password = hash;
//   });
// }
const loadGalleries = () => {
  return new Promise((resolve) => {
    resolve(Object.values(db.galleries).sort());
  });
};
const loadGallery = (galleryId) => {
  return new Promise((resolve, reject) => {
    if (galleryId in db.galleries) {
      resolve(db.galleries[galleryId]);
    } else {
      reject(CONST.ERROR_NOT_FOUND);
    }
  });
};
const loadGalleryPhotos = (galleryId) => {
  return new Promise((resolve, reject) => {
    switch (galleryId) {
      case CONST.SPECIAL_GALLERY_ALL:
        resolve(Object.values(db.photos).sort());
        break;
      case CONST.SPECIAL_GALLERY_NONE:
        {
          const galleriesPhotos = Object.values(db.galleryPhotos).flat();
          const photos = Object.keys(db.photos)
            .filter((photoId) => !galleriesPhotos.includes(photoId))
            .map((photoId) => db.photos[photoId])
            .sort();
          resolve(photos);
        }
        break;
      default:
        if (galleryId in db.galleries) {
          const photos = db.galleryPhotos[galleryId].map(
            (photoId) => db.photos[photoId]
          );
          resolve(photos);
        } else {
          reject(CONST.ERROR_NOT_FOUND);
        }
        break;
    }
  });
};
const loadGalleryPhoto = (galleryId, photoId) => {
  return new Promise((resolve, reject) => {
    const handleGalleryAll = () => {
      loadPhoto(photoId)
        .then((photo) => resolve(photo))
        .catch((error) => reject(error));
    };
    const handleGalleryNone = () => {
      const galleriesPhotos = Object.values(db.galleryPhotos).flat();
      const photos = Object.keys(db.photos)
        .filter((id) => id === photoId)
        .filter((id) => !galleriesPhotos.includes(id))
        .map((id) => db.photos[id])
        .sort();
      if (photos.length === 0) {
        return reject(CONST.ERROR_NOT_FOUND);
      }
      resolve(photos[0]);
    };
    const handleGallery = () => {
      if (!(galleryId in db.galleries)) {
        return reject(CONST.ERROR_NOT_FOUND);
      }
      const photos = db.galleryPhotos[galleryId]
        .filter((id) => id === photoId)
        .map((id) => db.photos[id]);
      if (photos.length === 0) {
        return reject(CONST.ERROR_NOT_FOUND);
      }
      resolve(photos[0]);
    };

    switch (galleryId) {
      case CONST.SPECIAL_GALLERY_ALL:
        return handleGalleryAll();
      case CONST.SPECIAL_GALLERY_NONE:
        return handleGalleryNone();
      default:
        return handleGallery();
    }
  });
};
const loadPhotos = () => {
  return new Promise((resolve) => {
    resolve(db.photos);
  });
};
const loadPhoto = (photoId) => {
  return new Promise((resolve, reject) => {
    if (!(photoId in db.photos)) {
      return reject(CONST.ERROR_NOT_FOUND);
    }
    resolve(db.photos[photoId]);
  });
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
    },
    plainUser: {
      [CONST.SPECIAL_GALLERY_ALL]: CONST.ACCESS_VIEW,
    },
    guest: {},
  },
  galleries: {
    gallery1: {
      id: "gallery1",
      title: "gallery 1",
      description: "",
    },
    gallery2: {
      id: "gallery2",
      title: "gallery 2",
      description: "",
    },
  },
  photos: {
    "somephoto.jpg": {
      id: "somephoto.jpg",
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
      camera: { make: "FUJIFILM", model: "X-T2", serial: "62054072" },
      lens: { make: "FUJIFILM", model: "XF27mmF2.8", serial: "44A07244" },
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
    "somephoto2.jpg": {
      id: "somephoto2.jpg",
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
    "somephoto3.jpg": {
      id: "somephoto3.jpg",
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
      camera: { make: "FUJIFILM", model: "X-T2", serial: "62054072" },
      lens: { make: "FUJIFILM", model: "XF27mmF2.8", serial: "44A07244" },
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
    "somephoto4.jpg": {
      id: "somephoto4.jpg",
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
      camera: { make: "FUJIFILM", model: "X100F", serial: "71001090" },
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
    gallery1: ["somephoto.jpg", "somephoto2.jpg"],
    gallery2: ["somephoto2.jpg", "somephoto3.jpg"],
  },
});
init();
