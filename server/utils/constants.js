const DEFAULT_ENV = "prod";
const DEFAULT_DEBUG = false;
const DEFAULT_PORT = 4200;
const SESSION_LENGTH_MS = 1000 * 60 * 60 * 24 * 7;

const API_ROOT = "/api";

const ERROR_NOT_IMPLEMENTED = "Not implemented";
const ERROR_NOT_FOUND = "Not found";
const ERROR_LOGIN = "Login failed";
const ERROR_SESSION_EXPIRED = "Session expired";
const ERROR_ACCESS_DELEGATE = "Access delegation";
const ERROR_ACCESS = "Access denied";

const STATS_UNKNOWN = "[unknown]";

const SPECIAL_GALLERY_PREFIX = ":";
const SPECIAL_GALLERY_ALL = `${SPECIAL_GALLERY_PREFIX}all`;
const SPECIAL_GALLERY_NONE = `${SPECIAL_GALLERY_PREFIX}none`;

const ACCESS_ADMIN = 2;
const ACCESS_VIEW = 1;
const ACCESS_NONE = 0;

const SPECIAL_GALLERIES = {
  [SPECIAL_GALLERY_ALL]: {
    id: SPECIAL_GALLERY_ALL,
    title: "All photos",
    description:
      "Contains all photos in the repository, regardless of galleries they have been linked to.",
    epoch: undefined,
  },
  [SPECIAL_GALLERY_NONE]: {
    id: SPECIAL_GALLERY_NONE,
    title: "Photos not in galleries",
    description:
      "Contains all photos that have not been linked to any galleries.",
    epoch: undefined,
  },
};

module.exports = {
  DEFAULT_ENV,
  DEFAULT_DEBUG,

  DEFAULT_PORT,
  SESSION_LENGTH_MS,

  API_ROOT,

  ERROR_NOT_IMPLEMENTED,
  ERROR_NOT_FOUND,
  ERROR_LOGIN,
  ERROR_SESSION_EXPIRED,
  ERROR_ACCESS_DELEGATE,
  ERROR_ACCESS,

  STATS_UNKNOWN,

  SPECIAL_GALLERY_PREFIX,
  SPECIAL_GALLERY_ALL,
  SPECIAL_GALLERY_NONE,
  SPECIAL_GALLERIES,

  ACCESS_ADMIN,
  ACCESS_VIEW,
  ACCESS_NONE,
};
