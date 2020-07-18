require("dotenv").config();

const PHOTO_ROOT = process.env.REACT_APP_PHOTO_ROOT;

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

export default {
  PHOTO_ROOT,

  DEFAULT_GALLERY,
  DEFAULT_THEME,
  INITIAL_GALLERY_VIEW,
  FIRST_WEEKDAY,
};
