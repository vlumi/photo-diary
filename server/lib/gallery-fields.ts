// Closed value sets for the configurable gallery fields. Mirrors the
// frontend's behaviour (`react-app/src/lib/theme.ts` for themes,
// `GalleryModel.lastPath` for initial views, `Month/Content.tsx` for
// epoch types). The API layer validates against these so junk values
// can't slip into the DB via the mutation endpoints.

export const GALLERY_THEMES = [
  "blue",
  "red",
  "grayscale",
  "contrast",
  "alert",
  "dark",
  "amoled",
  "forest",
  "silver",
  "showcase",
  "teal",
  "paper",
  "amber",
  "lavender",
  "sage",
  "slate",
  "midnight",
  "espresso",
] as const;

export const GALLERY_INITIAL_VIEWS = ["year", "month", "day", "photo"] as const;

export const GALLERY_EPOCH_TYPES = ["birthday", "1-index", "0-index"] as const;
