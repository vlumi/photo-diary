const DEFAULT_ENV = "prod";
const DEFAULT_DEBUG = false;
const DEFAULT_PORT = 4200;
const SESSION_LENGTH_MS = 1000 * 60 * 60 * 24 * 7;

const API_ROOT = "/api";

const ERROR_NOT_IMPLEMENTED = "Not implemented";
const ERROR_NOT_FOUND = "Not found";
const ERROR_LOGIN = "Login failed";
const ERROR_INVALID_TOKEN = "Invalid token";
const ERROR_ACCESS_DELEGATE = "Access delegation";
const ERROR_ACCESS = "Access denied";
const ERROR_UNAVAILABLE = "Service not available";

const STATS_UNKNOWN = "[unknown]";

const SPECIAL_GALLERY_PREFIX = ":";
const SPECIAL_GALLERY_ALL = `${SPECIAL_GALLERY_PREFIX}all`;
const SPECIAL_GALLERY_PUBLIC = `${SPECIAL_GALLERY_PREFIX}public`;
const SPECIAL_GALLERY_PRIVATE = `${SPECIAL_GALLERY_PREFIX}private`;
const SPECIAL_GALLERIES = {
  [SPECIAL_GALLERY_ALL]: {
    id: SPECIAL_GALLERY_ALL,
    title: "All photos",
    description:
      "Contains all photos in the repository.",
    epoch: undefined,
  },
  [SPECIAL_GALLERY_PUBLIC]: {
    id: SPECIAL_GALLERY_PUBLIC,
    title: "Photos in galleries",
    description: "Contains all photos linked to galleries.",
    epoch: undefined,
  },
  [SPECIAL_GALLERY_PRIVATE]: {
    id: SPECIAL_GALLERY_PRIVATE,
    title: "Photos not in galleries",
    description: "Contains all photos not linked to galleries.",
    epoch: undefined,
  },
};
const isSpecialGallery = (galleryId) => galleryId in SPECIAL_GALLERIES;

const ACCESS_ADMIN = 2;
const ACCESS_VIEW = 1;
const ACCESS_NONE = 0;

module.exports = {
  DEFAULT_ENV,
  DEFAULT_DEBUG,

  DEFAULT_PORT,
  SESSION_LENGTH_MS,

  API_ROOT,

  ERROR_NOT_IMPLEMENTED,
  ERROR_NOT_FOUND,
  ERROR_LOGIN,
  ERROR_INVALID_TOKEN,
  ERROR_ACCESS_DELEGATE,
  ERROR_ACCESS,
  ERROR_UNAVAILABLE,

  STATS_UNKNOWN,

  SPECIAL_GALLERY_PREFIX,
  SPECIAL_GALLERY_ALL,
  SPECIAL_GALLERY_PRIVATE,
  SPECIAL_GALLERY_PUBLIC,
  SPECIAL_GALLERIES,
  isSpecialGallery,

  ACCESS_ADMIN,
  ACCESS_VIEW,
  ACCESS_NONE,
};
