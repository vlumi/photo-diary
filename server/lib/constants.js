const DEFAULT_ENV = "prod";
const DEFAULT_DEBUG = false;

const DEFAULT_PORT = 4200;
const SESSION_LENGTH_MS = 1000 * 60 * 60 * 24 * 7;

const API_ROOT = "/api";
const GUEST_USER = ":guest";

const ERROR_NOT_IMPLEMENTED = "Not implemented";
const ERROR_NOT_FOUND = "Not found";
const ERROR_LOGIN = "Login failed";
const ERROR_INVALID_TOKEN = "Invalid token";
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
    title: "All",
    description: "All photos.",
    icon: undefined,
    epoch: undefined,
    epoch_type: undefined,
    theme: "bw",
    initialView: "year",
  },
  [SPECIAL_GALLERY_PUBLIC]: {
    id: SPECIAL_GALLERY_PUBLIC,
    title: "Public",
    description: "All photos in galleries.",
    icon: undefined,
    epoch: undefined,
    epoch_type: undefined,
    theme: undefined,
    initialView: undefined,
  },
  [SPECIAL_GALLERY_PRIVATE]: {
    id: SPECIAL_GALLERY_PRIVATE,
    title: "Private",
    description: "Photos not in any galleries.",
    icon: undefined,
    epoch: undefined,
    epoch_type: undefined,
    theme: "alert",
    initialView: "month",
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
  GUEST_USER,

  ERROR_NOT_IMPLEMENTED,
  ERROR_NOT_FOUND,
  ERROR_LOGIN,
  ERROR_INVALID_TOKEN,
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
