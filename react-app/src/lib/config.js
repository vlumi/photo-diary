require("dotenv").config();

/**
 * The root URL for accessing the photo files. The display-sized photos should be inside `display`, and the thumbnails inside `thumbnail` directory.
 *
 * This can be overridden with the instance metadata `cdn`.
 */
var PHOTO_ROOT_URL = process.env.REACT_APP_PHOTO_ROOT_URL || "/";
/**
 * The default language to choose if the user has not selected one.
 */
const DEFAULT_LANGUAGE = process.env.REACT_APP_DEFAULT_LANGUAGE || "en";
/**
 * see "themes.css"
 */
const DEFAULT_THEME = process.env.REACT_APP_THEME || "blue";
/**
 * The default gallery to redirect to when accessing the galleries end-point.
 */
const DEFAULT_GALLERY = process.env.REACT_APP_DEFAULT_GALLERY || undefined;
/**
 * The view to redirect to from the gallery root end-point, to the last element of the respective view.
 *
 * One of "year", "month", "day", "photo"
 */
const INITIAL_GALLERY_VIEW =
  process.env.REACT_APP_INITIAL_GALLERY_VIEW || "month";
/**
 * The first day of the week for the calendar grid of the year view.
 *
 * 1 = Monday, 0 = Sunday
 */
const FIRST_WEEKDAY = process.env.REACT_APP_FIRST_WEEKDAY || 1;

let lang = DEFAULT_LANGUAGE;

export default {
  PHOTO_ROOT_URL: PHOTO_ROOT_URL,

  DEFAULT_LANGUAGE,
  DEFAULT_GALLERY,
  DEFAULT_THEME,
  INITIAL_GALLERY_VIEW,
  FIRST_WEEKDAY,

  lang,
};
