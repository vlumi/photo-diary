const CONST = require("../constants");

const loadUserAccessControl = (username, onSuccess, onError) => {
  if (username in dummyAccessControl) {
    onSuccess(dummyAccessControl[username]);
  } else {
    onError(CONST.ERROR_NOT_FOUND);
  }
};
const loadUser = (username, onSuccess, onError) => {
  if (username in dummyUsers) {
    onSuccess(dummyUsers[username]);
  } else {
    onError(CONST.ERROR_NOT_FOUND);
  }
};
// TODO: something like this for create/update user to hash the password:
// const dummyGetUser = (username) => DUMMY_USERS[username];
// {
//   const saltRounds = 10;
//   bcrypt.hash("foobar", saltRounds, function (err, hash) {
//     DUMMY_USERS["admin"].password = hash;
//   });
// }
const loadGalleries = (onSuccess, onError) => {
  onSuccess(Object.values(dummyGalleries).sort());
};
const loadGallery = (galleryId, onSuccess, onError) => {
  if (galleryId in dummyGalleries) {
    onSuccess(dummyGalleries[galleryId]);
  } else {
    onError(CONST.ERROR_NOT_FOUND);
  }
};
const loadGalleryPhotos = (galleryId, onSuccess, onError) => {
  switch (galleryId) {
    case CONST.SPECIAL_GALLERY_ALL:
      onSuccess(Object.values(dummyPhotos).sort());
      break;
    case CONST.SPECIAL_GALLERY_NONE:
      const galleriesPhotos = Object.values(dummyGalleryPhotos).flat();
      const photos = Object.keys(dummyPhotos)
        .filter((photoId) => !galleriesPhotos.includes(photoId))
        .map((photoId) => dummyPhotos[photoId])
        .sort();
      onSuccess(photos);
      break;
    default:
      if (galleryId in dummyGalleries) {
        const photos = dummyGalleryPhotos[galleryId].map(
          (photoId) => dummyPhotos[photoId]
        );
        onSuccess(photos);
      } else {
        onError(CONST.ERROR_NOT_FOUND);
      }
      break;
  }
};
const loadGalleryPhoto = (galleryId, photoId, onSuccess, onError) => {
  switch (galleryId) {
    case CONST.SPECIAL_GALLERY_ALL:
      loadPhoto(photoId, onSuccess, onError);
      break;
    case CONST.SPECIAL_GALLERY_NONE:
      const galleriesPhotos = Object.values(dummyGalleryPhotos).flat();
      const photos = Object.keys(dummyPhotos)
        .filter((id) => id === photoId)
        .filter((id) => !galleriesPhotos.includes(id))
        .map((id) => dummyPhotos[id])
        .sort();
      if (photoId in photos) {
        onSuccess(photos[photoId]);
      } else {
        onError(CONST.ERROR_NOT_FOUND);
      }
      break;
    default:
      if (galleryId in dummyGalleries) {
        console.log("here", dummyGalleryPhotos[galleryId], photoId);
        const photos = dummyGalleryPhotos[galleryId]
          .filter((id) => id === photoId)
          .map((id) => dummyPhotos[id]);
        console.log(photos);
        if (photos.length > 0) {
          onSuccess(photos[0]);
        } else {
          onError(CONST.ERROR_NOT_FOUND);
        }
      } else {
        onError(CONST.ERROR_NOT_FOUND);
      }
      break;
  }
};
const loadPhotos = (onSuccess, onError) => {
  onSuccess(dummyPhotos);
};
const loadPhoto = (photoId, onSuccess, onError) => {
  if (photoId in dummyPhotos) {
    onSuccess(dummyPhotos[photoId]);
  } else {
    onError(CONST.ERROR_NOT_FOUND);
  }
};

/**
 * Dummy DB, with all DB values hard-coded.
 */
module.exports = () => {
  return {
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

const dummyUsers = {
  admin: {
    password: "$2b$10$7edID90/TmAdhGtJRqjDj.hBzXEJZorgDYZ9jwPcdDdqceYlaQ2ZG",
  },
  gallery1Admin: {
    password: "",
  },
  gallery1User: {
    password: "",
  },
  gallery12User: {
    password: "",
  },
  plainUser: {
    password: "",
  },
};
const dummyAccessControl = {
  admin: {
    [CONST.SPECIAL_GALLERY_ALL]: CONST.ACCESS_ADMIN,
  },
  gallery1Admin: {
    [CONST.SPECIAL_GALLERY_ALL]: CONST.ACCESS_VIEW,
    gallery1: CONST.ACCESS_ADMIN,
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
};

const dummyAdmins = ["admin"];
const dummyGalleryAdmins = {};
const dummyGalleryUsers = {};
const dummyGalleries = {
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
};
const dummyPhotos = {
  "somephoto.jpg": {
    id: "somephoto.jpg",
    title: "",
    description: "",
    taken: {
      timestamp: "2018-05-04 13:13:03",
      year: 2018,
      month: 5,
      day: 4,
      hour: 13,
      minute: 13,
      second: 3,
      country: "jp",
      place: "",
      author: "Ville Misaki",
    },
    camera: { make: "FUJIFILM", model: "X-T2", serial: "62054072" },
    lens: { make: "FUJIFILM", model: "XF27mmF2.8", serial: "44A07244" },
    exposure: {
      focalLength: 27,
      focalLength35mmEquiv: 41,
      aperture: 5.6,
      shutterSpeed: "1/744",
      iso: 200,
    },
    size: {
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
      timestamp: "2020-07-04 14:13:03",
      year: 2020,
      month: 7,
      day: 4,
      hour: 14,
      minute: 13,
      second: 3,
      country: "nl",
      place: "",
      author: "Ville Misaki",
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
      shutterSpeed: "1/15",
      iso: 200,
    },
    size: {
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
      timestamp: "2020-07-05 14:13:03",
      year: 2020,
      month: 7,
      day: 5,
      hour: 14,
      minute: 13,
      second: 3,
      country: "jp",
      place: "",
      author: "Ville Misaki",
    },
    camera: { make: "FUJIFILM", model: "X-T2", serial: "62054072" },
    lens: { make: "FUJIFILM", model: "XF27mmF2.8", serial: "44A07244" },
    exposure: {
      focalLength: 27,
      focalLength35mmEquiv: 41,
      aperture: 5.6,
      shutterSpeed: "1/744",
      iso: 200,
    },
    size: {
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
      timestamp: "2020-08-05 14:13:03",
      year: 2020,
      month: 8,
      day: 5,
      hour: 14,
      minute: 13,
      second: 3,
      country: "fi",
      place: "",
      author: "Ville Misaki",
    },
    camera: { make: "FUJIFILM", model: "X100F", serial: "71001090" },
    lens: { make: undefined, model: undefined, serial: undefined },
    exposure: {
      focalLength: 23,
      focalLength35mmEquiv: undefined,
      aperture: 5.6,
      shutterSpeed: "1/133",
      iso: 200,
    },
    size: { width: 6000, height: 4000 },
  },
};
const dummyGalleryPhotos = {
  gallery1: ["somephoto.jpg", "somephoto2.jpg"],
  gallery2: ["somephoto2.jpg", "somephoto3.jpg"],
};
