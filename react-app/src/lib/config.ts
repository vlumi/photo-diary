// Frontend config defaults. Per-instance behavior comes from the API at
// boot — `/api/v1/meta` returns server-side env overrides for `cdn`,
// `defaultGallery`, `defaultTheme`, `initialGalleryView`, and `firstWeekday`,
// which `Gallery/index.tsx` applies to the values below. Per-gallery `theme`
// and `initialView` from each gallery row take precedence over these defaults.
//
// `DEFAULT_LANGUAGE` is read by i18next at module load (before meta fetches),
// so it can't be overridden at runtime — change the literal here if you need
// a different fallback language for new visitors. Users' own selections are
// persisted via the `lang` localStorage key.

// Overridden at runtime by `meta.cdn`. Display-sized photos go under `display`,
// thumbnails under `thumbnail`.
let PHOTO_ROOT_URL = "/";

const DEFAULT_LANGUAGE = "en";

// Overridden at runtime by `meta.defaultTheme`. See `themes.css`. Used when a
// gallery has no theme set.
let DEFAULT_THEME = "blue";

// Overridden at runtime by `meta.defaultGallery`. The default gallery to
// redirect to at `/g` when no other heuristic (single-gallery, hostname match)
// picks one.
let DEFAULT_GALLERY: string | undefined = undefined;

// Overridden at runtime by `meta.initialGalleryView`. One of
// "year" | "month" | "day" | "photo". Used when a gallery has no
// `initial_view` set.
let INITIAL_GALLERY_VIEW = "month";

// Overridden at runtime by `meta.firstWeekday`. The first day of the week for
// the calendar grid of the year view. 1 = Monday, 0 = Sunday.
let FIRST_WEEKDAY = 1;

let lang = DEFAULT_LANGUAGE;

interface Config {
  PHOTO_ROOT_URL: string;
  DEFAULT_LANGUAGE: string;
  DEFAULT_GALLERY: string | undefined;
  DEFAULT_THEME: string;
  INITIAL_GALLERY_VIEW: string;
  FIRST_WEEKDAY: number;
  lang: string;
}

const config: Config = {
  PHOTO_ROOT_URL,

  DEFAULT_LANGUAGE,
  DEFAULT_GALLERY,
  DEFAULT_THEME,
  INITIAL_GALLERY_VIEW,
  FIRST_WEEKDAY,

  lang,
};

export default config;
