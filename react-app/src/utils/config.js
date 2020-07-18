require("dotenv").config();

const PHOTO_ROOT = process.env.REACT_APP_PHOTO_ROOT;

const DEFAULT_THEME = process.env.REACT_APP_THEME || "blue";
const DEFAULT_GALLERY = process.env.REACT_APP_DEFAULT_GALLERY || undefined;
const FIRST_WEEKDAY = process.env.REACT_APP_FIRST_WEEKDAY || 1; // Monday
const LAST_WEEKDAY = (FIRST_WEEKDAY + 7 - 1) % 7;

export default {
  PHOTO_ROOT,

  DEFAULT_GALLERY,
  DEFAULT_THEME,
  FIRST_WEEKDAY,
  LAST_WEEKDAY,
};
