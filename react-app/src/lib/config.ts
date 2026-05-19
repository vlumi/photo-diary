/**
 * The root URL for accessing the photo files. The display-sized photos should be inside `display`, and the thumbnails inside `thumbnail` directory.
 *
 * This can be overridden with the instance metadata `cdn`.
 */
const env = import.meta.env;
let PHOTO_ROOT_URL = env.VITE_PHOTO_ROOT_URL || "/";
/**
 * The default language to choose if the user has not selected one.
 */
const DEFAULT_LANGUAGE = env.VITE_DEFAULT_LANGUAGE || "en";
/**
 * see "themes.css"
 */
const DEFAULT_THEME = env.VITE_THEME || "blue";
/**
 * The default gallery to redirect to when accessing the galleries end-point.
 */
const DEFAULT_GALLERY = env.VITE_DEFAULT_GALLERY || undefined;
/**
 * The view to redirect to from the gallery root end-point, to the last element of the respective view.
 *
 * One of "year", "month", "day", "photo"
 */
const INITIAL_GALLERY_VIEW = env.VITE_INITIAL_GALLERY_VIEW || "month";
/**
 * The first day of the week for the calendar grid of the year view.
 *
 * 1 = Monday, 0 = Sunday
 */
const FIRST_WEEKDAY: number = env.VITE_FIRST_WEEKDAY
  ? Number(env.VITE_FIRST_WEEKDAY)
  : 1;

let lang = DEFAULT_LANGUAGE;

export default {
  PHOTO_ROOT_URL,

  DEFAULT_LANGUAGE,
  DEFAULT_GALLERY,
  DEFAULT_THEME,
  INITIAL_GALLERY_VIEW,
  FIRST_WEEKDAY,

  lang,
};
