const DEFAULT_PORT = 4200;
const API_ROOT = "/api";

const ERROR_NOT_IMPLEMENTED = "Not implemented";
const ERROR_NOT_FOUND = "Not found";
const ERROR_LOGIN = "Login failed";

const STATS_UNKNOWN = "unknown";

const SPECIAL_GALLERY_PREFIX = ":";
const SPECIAL_GALLERY_ALL = `${SPECIAL_GALLERY_PREFIX}all`;
const SPECIAL_GALLERY_NONE = `${SPECIAL_GALLERY_PREFIX}none`;

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
  DEFAULT_PORT,
  API_ROOT,

  ERROR_NOT_IMPLEMENTED,
  ERROR_NOT_FOUND,
  ERROR_LOGIN,

  STATS_UNKNOWN,

  SPECIAL_GALLERY_PREFIX,
  SPECIAL_GALLERY_ALL,
  SPECIAL_GALLERY_NONE,
  SPECIAL_GALLERIES,
};
