const DEFAULT_ENV = "prod";
const DEFAULT_DEBUG = false;

const DEFAULT_PORT = 4200;
// Access JWT lifetime: 15 minutes. Short enough that a stolen token has
// limited blast radius; long enough that a busy session doesn't refresh
// constantly.
const ACCESS_TOKEN_LIFETIME_MS = 1000 * 60 * 15;
// Session/refresh-token sliding window: 90 days of inactivity before the
// session expires. Each successful refresh resets the timer.
const SESSION_LENGTH_MS = 1000 * 60 * 60 * 24 * 90;

const API_ROOT = "/api";
const GUEST_USER = ":guest";

const STATS_UNKNOWN = "[unknown]";

const SPECIAL_GALLERY_PREFIX = ":";
const SPECIAL_GALLERY_ALL = `${SPECIAL_GALLERY_PREFIX}all`;
const SPECIAL_GALLERY_PUBLIC = `${SPECIAL_GALLERY_PREFIX}public`;
const SPECIAL_GALLERIES = {
  [SPECIAL_GALLERY_ALL]: {
    id: SPECIAL_GALLERY_ALL,
    title: "All",
    description: "All photos.",
    icon: undefined,
    epoch: undefined,
    epoch_type: undefined,
    theme: undefined,
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
};
const isSpecialGallery = (galleryId: string): boolean =>
  galleryId in SPECIAL_GALLERIES;

const ACCESS_ADMIN = 2;
const ACCESS_VIEW = 1;
const ACCESS_NONE = 0;

export default {
  DEFAULT_ENV,
  DEFAULT_DEBUG,

  DEFAULT_PORT,
  ACCESS_TOKEN_LIFETIME_MS,
  SESSION_LENGTH_MS,

  API_ROOT,
  GUEST_USER,

  STATS_UNKNOWN,

  SPECIAL_GALLERY_PREFIX,
  SPECIAL_GALLERY_ALL,
  SPECIAL_GALLERY_PUBLIC,
  SPECIAL_GALLERIES,
  isSpecialGallery,

  ACCESS_ADMIN,
  ACCESS_VIEW,
  ACCESS_NONE,
};
