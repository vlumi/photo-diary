/* eslint-disable @typescript-eslint/no-explicit-any */
import { randomUUID } from "node:crypto";

import CONST from "../lib/constants.js";
import { NotFoundError, NotImplementedError } from "../lib/errors.js";

const notImplemented = async (): Promise<never> => {
  throw new NotImplementedError();
};

/**
 * Dummy DB, with all DB values hard-coded.
 */
export default () => {
  return {
    init,

    loadMetas,
    createMeta,
    loadMeta,
    updateMeta,
    deleteMeta: notImplemented,

    loadUsers,
    createUser,
    loadUser,
    updateUser,
    deleteUser: notImplemented,

    resolveAccessLevel,
    loadUserGalleryRows: notImplemented,
    upsertUserGallery: notImplemented,
    deleteUserGallery: notImplemented,
    resolveHideMap,

    loadGalleries,
    createGallery,
    loadGallery,
    updateGallery,
    deleteGallery: notImplemented,

    loadGalleryPhotos,
    linkGalleryPhoto,
    loadGalleryPhoto,
    unlinkGalleryPhoto,
    unlinkAllPhotos,
    unlinkAllGalleries,

    loadPhotos,
    createPhoto,
    loadPhoto,
    updatePhoto,
    deletePhoto: notImplemented,
  };
};

let db: any = undefined;
const init = () => {
  db = JSON.parse(dbDump);
};

const loadMetas = async () => {
  return Object.values(db.meta);
};
const createMeta = async () => {
  throw new NotImplementedError();
};
const loadMeta = async (key: string) => {
  if (!(key in db.meta)) {
    throw new NotFoundError();
  }
  return db.meta[key];
};
const updateMeta = async () => {
  throw new NotImplementedError();
};

const loadUsers = async () => {
  return Object.values(db.users);
};
const createUser = async () => {
  throw new NotImplementedError();
};
const loadUser = async (id: string) => {
  if (!(id in db.users)) {
    throw new NotFoundError();
  }
  return db.users[id];
};
const updateUser = async () => {
  throw new NotImplementedError();
};

const resolveAccessLevel = async (
  userId: string,
  galleryId: string
): Promise<number | undefined> => {
  const isSpecial = galleryId.startsWith(":");
  const galleries = isSpecial ? [galleryId, ":all"] : [galleryId, ":public", ":all"];
  const userRows = (db.accessControl[userId] ?? {}) as Record<string, number>;
  for (const g of galleries) if (g in userRows) return userRows[g];
  const guestRows = (db.accessControl[":guest"] ?? {}) as Record<string, number>;
  for (const g of galleries) if (g in guestRows) return guestRows[g];
  return undefined;
};
const resolveHideMap = async (
  _userId: string,
  _galleryId: string
): Promise<number | undefined> => {
  // Dummy ACL data carries only access levels, no privacy overrides.
  return undefined;
};

const loadGalleries = async () => {
  return Object.values(db.galleries).sort();
};
const createGallery = async () => {
  throw new NotImplementedError();
};
const loadGallery = async (galleryId: string) => {
  if (!(galleryId in db.galleries)) {
    throw new NotFoundError();
  }
  return db.galleries[galleryId];
};
const updateGallery = async () => {
  throw new NotImplementedError();
};

const comparePhotos = (a: any, b: any) =>
  a.taken.instant.timestamp.localeCompare(b.taken.instant.timestamp);

const loadGalleryPhotos = async (galleryId: string) => {
  switch (galleryId) {
    case CONST.SPECIAL_GALLERY_ALL:
      return Object.values(db.photos).sort(comparePhotos);
    case CONST.SPECIAL_GALLERY_PUBLIC:
      return [...new Set(Object.values(db.galleryPhotos).flat() as string[])]
        .map((photoId: string) => db.photos[photoId])
        .sort(comparePhotos);
    case CONST.SPECIAL_GALLERY_PRIVATE: {
      const galleriesPhotos = Object.values(db.galleryPhotos).flat();
      const photos = Object.keys(db.photos)
        .filter((photoId: string) => !galleriesPhotos.includes(photoId))
        .map((photoId: string) => db.photos[photoId])
        .sort(comparePhotos);
      return photos;
    }
    default: {
      if (!(galleryId in db.galleries)) {
        throw new NotFoundError();
      }
      const photos = db.galleryPhotos[galleryId]
        .map((photoId: string) => db.photos[photoId])
        .sort(comparePhotos);
      return photos;
    }
  }
};
const linkGalleryPhoto = async () => {
  throw new NotImplementedError();
};
const loadGalleryPhoto = async (galleryId: string, photoId: string) => {
  const handleGalleryAll = async () => {
    return await loadPhoto(photoId);
  };
  const handleGalleryPrivate = async () => {
    const galleriesPhotos = Object.values(db.galleryPhotos).flat();
    const photos = Object.keys(db.photos)
      .filter((id: string) => id === photoId)
      .filter((id: string) => !galleriesPhotos.includes(id))
      .map((id: string) => db.photos[id])
      .sort(comparePhotos);
    if (photos.length === 0) {
      throw new NotFoundError();
    }
    return photos[0];
  };
  const handleGalleryPublic = async () => {
    const galleriesPhotos = Object.values(db.galleryPhotos).flat();
    const photos = Object.keys(db.photos)
      .filter((id: string) => id === photoId)
      .filter((id: string) => galleriesPhotos.includes(id))
      .map((id: string) => db.photos[id])
      .sort(comparePhotos);
    if (photos.length === 0) {
      throw new NotFoundError();
    }
    return photos[0];
  };
  const handleGallery = async () => {
    if (!(galleryId in db.galleries)) {
      throw new NotFoundError();
    }
    const photos = db.galleryPhotos[galleryId]
      .filter((id: string) => id === photoId)
      .map((id: string) => db.photos[id]);
    if (photos.length === 0) {
      throw new NotFoundError();
    }
    return photos[0];
  };

  switch (galleryId) {
    case CONST.SPECIAL_GALLERY_ALL:
      return await handleGalleryAll();
    case CONST.SPECIAL_GALLERY_PUBLIC:
      return await handleGalleryPublic();
    case CONST.SPECIAL_GALLERY_PRIVATE:
      return await handleGalleryPrivate();
    default:
      return await handleGallery();
  }
};
const unlinkGalleryPhoto = async () => {
  throw new NotImplementedError();
};
const unlinkAllPhotos = async () => {
  throw new NotImplementedError();
};
const unlinkAllGalleries = async () => {
  throw new NotImplementedError();
};

const loadPhotos = async () => {
  return db.photos;
};
const createPhoto = async () => {
  throw new NotImplementedError();
};
const loadPhoto = async (photoId: string) => {
  if (!(photoId in db.photos)) {
    throw new NotFoundError();
  }
  return db.photos[photoId];
};
const updatePhoto = async () => {
  throw new NotImplementedError();
};

const dbDump = JSON.stringify({
  meta: {
    schema_version: { schema_version: "1" },
    instance_name: { instance_name: "dummy instance" },
    instance_description: {
      instance_description: "dummy instance for automated tests",
    },
    instance_cdn: { instance_cdn: "http://localhost" },
    instance_image: { instance_image: "dummy.jpg" },
  },
  users: {
    admin: {
      id: "admin",
      password: "$2b$10$7edID90/TmAdhGtJRqjDj.hBzXEJZorgDYZ9jwPcdDdqceYlaQ2ZG",
      secret: randomUUID(),
    },
    gallery1Admin: {
      id: "gallery1Admin",
      password: "$2b$10$7edID90/TmAdhGtJRqjDj.hBzXEJZorgDYZ9jwPcdDdqceYlaQ2ZG",
      secret: randomUUID(),
    },
    gallery2Admin: {
      id: "gallery2Admin",
      password: "$2b$10$7edID90/TmAdhGtJRqjDj.hBzXEJZorgDYZ9jwPcdDdqceYlaQ2ZG",
      secret: randomUUID(),
    },
    gallery1User: {
      id: "gallery1User",
      password: "$2b$10$7edID90/TmAdhGtJRqjDj.hBzXEJZorgDYZ9jwPcdDdqceYlaQ2ZG",
      secret: randomUUID(),
    },
    gallery12User: {
      id: "gallery12User",
      password: "$2b$10$7edID90/TmAdhGtJRqjDj.hBzXEJZorgDYZ9jwPcdDdqceYlaQ2ZG",
      secret: randomUUID(),
    },
    plainUser: {
      id: "plainUser",
      password: "$2b$10$7edID90/TmAdhGtJRqjDj.hBzXEJZorgDYZ9jwPcdDdqceYlaQ2ZG",
      secret: randomUUID(),
    },
    publicUser: {
      id: "publicUser",
      password: "$2b$10$7edID90/TmAdhGtJRqjDj.hBzXEJZorgDYZ9jwPcdDdqceYlaQ2ZG",
      secret: randomUUID(),
    },
    simpleUser: {
      id: "simpleUser",
      password: "$2b$10$7edID90/TmAdhGtJRqjDj.hBzXEJZorgDYZ9jwPcdDdqceYlaQ2ZG",
      secret: randomUUID(),
    },
    blockedUser: {
      id: "blockedUser",
      password: "$2b$10$7edID90/TmAdhGtJRqjDj.hBzXEJZorgDYZ9jwPcdDdqceYlaQ2ZG",
      secret: randomUUID(),
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
    publicUser: {
      [CONST.SPECIAL_GALLERY_PUBLIC]: CONST.ACCESS_VIEW,
    },
    simpleUser: {},
    blockedUser: {
      [CONST.SPECIAL_GALLERY_ALL]: CONST.ACCESS_NONE,
    },
    ":guest": {
      gallery3: CONST.ACCESS_VIEW,
    },
  },
  galleries: {
    gallery1: {
      id: "gallery1",
      title: "gallery 1",
      description: "This is the first gallery",
      theme: "",
    },
    gallery2: {
      id: "gallery2",
      title: "gallery 2",
      description: "This is the second gallery",
      theme: "blue",
    },
    gallery3: {
      id: "gallery3",
      title: "gallery 3",
      description: "This is the third gallery",
      theme: "grayscale",
    },
  },
  photos: {
    "gallery1photo.jpg": {
      id: "gallery1photo.jpg",
      index: 0,
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
            latitude: 35.6595,
            longitude: 139.7005,
            altitude: 36.5,
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
      index: 1,
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
      index: 2,
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
      index: 3,
      title: "",
      description: "",
      taken: {
        instant: {
          timestamp: "2020-07-05 14:13:04",
          year: 2020,
          month: 7,
          day: 6,
          hour: 14,
          minute: 13,
          second: 4,
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
      index: 4,
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
