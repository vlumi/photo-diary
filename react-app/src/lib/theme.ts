type ThemeName =
  | "blue"
  | "red"
  | "grayscale"
  | "contrast"
  | "alert"
  | "dark"
  | "amoled"
  | "forest"
  | "silver"
  | "showcase"
  | "teal"
  | "paper"
  | "amber"
  | "lavender"
  | "sage"
  | "slate"
  | "midnight"
  | "espresso";

// Theme variable roles:
//   primary-color        main text / dark accents
//   primary-background   page background
//   inactive-color       muted text and borders (disabled, weekday labels)
//   header-color         text on header bands (top menu, day-title column)
//   header-sub-color     secondary text on header bands
//   header-background    background of header bands
//   tile-background      background of the Year view's month tiles (distinct from page bg so tiles read as cards)
//   photo-frame-mat      matte colour around the photo (intentionally neutral, not theme-tinted)
//   photo-frame-border   thin border between matte and photo (neutral)
//   filter               CSS filter applied to the photos themselves (grayscale, sepia, ...)
type ThemeKey =
  | "primary-color"
  | "primary-background"
  | "inactive-color"
  | "header-color"
  | "header-sub-color"
  | "header-background"
  | "tile-background"
  | "photo-frame-mat"
  | "photo-frame-border"
  | "filter";
type Theme = Record<ThemeKey, string>;

// Photo-frame variables are deliberately kept neutral (not tinted) so the
// matte reads as a separator between the photo and the surrounding theme,
// not as more theme chrome. Light themes share one neutral pair, dark
// themes another.
const FRAME_LIGHT = {
  "photo-frame-mat": "#b0b0b0",
  "photo-frame-border": "#444",
} as const;
const FRAME_DARK = {
  "photo-frame-mat": "#555",
  "photo-frame-border": "#aaa",
} as const;

const THEMES: Record<ThemeName, Theme> = {
  blue: {
    "primary-color": "#004",
    "primary-background": "#ddf",
    "inactive-color": "#99b",
    "header-color": "#fff",
    "header-sub-color": "#ddf",
    "header-background": "#004",
    "tile-background": "#fff",
    ...FRAME_LIGHT,
    filter: "none",
  },
  red: {
    "primary-color": "#4a1424",
    "primary-background": "#f0e3e3",
    "inactive-color": "#b59a9a",
    "header-color": "#fff",
    "header-sub-color": "#f0e3e3",
    "header-background": "#4a1424",
    "tile-background": "#fff",
    ...FRAME_LIGHT,
    filter: "none",
  },
  grayscale: {
    "primary-color": "#444",
    "primary-background": "#ddd",
    "inactive-color": "#999",
    "header-color": "#fff",
    "header-sub-color": "#ddd",
    "header-background": "#444",
    "tile-background": "#fff",
    ...FRAME_LIGHT,
    filter: "grayscale(100%)",
  },
  // High-contrast light: pure black on white, no photo filter. Renamed
  // from `bw` since the monochrome-photo filter is gone — too close to
  // grayscale otherwise.
  contrast: {
    "primary-color": "#000",
    "primary-background": "#fff",
    "inactive-color": "#666",
    "header-color": "#fff",
    "header-sub-color": "#ddd",
    "header-background": "#000",
    "tile-background": "#fff",
    ...FRAME_LIGHT,
    filter: "none",
  },
  // Loud red-on-yellow surface intended as a visibility flag — apply
  // to a gallery the operator wants to mark as draft, sensitive, or
  // otherwise unsafe to confuse with regular content. Not for default
  // use.
  alert: {
    "primary-color": "#f00",
    "primary-background": "#ff6",
    "inactive-color": "#999",
    "header-color": "#ff6",
    "header-sub-color": "#ddd",
    "header-background": "#f00",
    "tile-background": "#ff6",
    ...FRAME_LIGHT,
    filter: "none",
  },
  dark: {
    "primary-color": "#e0e0e0",
    "primary-background": "#1a1a1a",
    "inactive-color": "#666",
    "header-color": "#fff",
    "header-sub-color": "#aaa",
    "header-background": "#2a2a2a",
    "tile-background": "#2a2a2a",
    ...FRAME_DARK,
    filter: "none",
  },
  amoled: {
    "primary-color": "#fff",
    "primary-background": "#000",
    "inactive-color": "#555",
    "header-color": "#fff",
    "header-sub-color": "#aaa",
    "header-background": "#000",
    "tile-background": "#1a1a1a",
    ...FRAME_DARK,
    filter: "none",
  },
  forest: {
    "primary-color": "#1e3a2a",
    "primary-background": "#e8f0e6",
    "inactive-color": "#8aa098",
    "header-color": "#fff",
    "header-sub-color": "#e8f0e6",
    "header-background": "#1e3a2a",
    "tile-background": "#fff",
    ...FRAME_LIGHT,
    filter: "none",
  },
  // Light overall: dark-text-on-light header, no dark header band.
  silver: {
    "primary-color": "#3a4250",
    "primary-background": "#e8ebef",
    "inactive-color": "#8a95a0",
    "header-color": "#2a3540",
    "header-sub-color": "#6a7580",
    "header-background": "#d4dadf",
    "tile-background": "#fff",
    ...FRAME_LIGHT,
    filter: "none",
  },
  // Photo-focused: dark backdrop so photos read like prints on a museum
  // wall, muted UI chrome so it doesn't compete.
  showcase: {
    "primary-color": "#ccc",
    "primary-background": "#141414",
    "inactive-color": "#555",
    "header-color": "#888",
    "header-sub-color": "#666",
    "header-background": "#0a0a0a",
    "tile-background": "#1f1f1f",
    ...FRAME_DARK,
    filter: "none",
  },
  teal: {
    "primary-color": "#114040",
    "primary-background": "#e0eef0",
    "inactive-color": "#80a0a0",
    "header-color": "#fff",
    "header-sub-color": "#e0eef0",
    "header-background": "#114040",
    "tile-background": "#fff",
    ...FRAME_LIGHT,
    filter: "none",
  },
  // Creamy printed-album feel without the photo desaturation that sepia
  // carried — page + header are both light cream, dark text reads on top.
  paper: {
    "primary-color": "#3a2e20",
    "primary-background": "#faf4e8",
    "inactive-color": "#b8a890",
    "header-color": "#3a2e20",
    "header-sub-color": "#8a7a60",
    "header-background": "#ece1ce",
    "tile-background": "#fefaf0",
    ...FRAME_LIGHT,
    filter: "none",
  },
  // Warm orange / burnt gold, fills the warm gap in the coloured set
  // between `red` and the greens.
  amber: {
    "primary-color": "#4a2008",
    "primary-background": "#fceedd",
    "inactive-color": "#b89878",
    "header-color": "#fff",
    "header-sub-color": "#fceedd",
    "header-background": "#4a2008",
    "tile-background": "#fff",
    ...FRAME_LIGHT,
    filter: "none",
  },
  // Cool purple, fills the violet gap between blue and red.
  lavender: {
    "primary-color": "#2a1a4a",
    "primary-background": "#ece4f5",
    "inactive-color": "#9a90b8",
    "header-color": "#fff",
    "header-sub-color": "#ece4f5",
    "header-background": "#2a1a4a",
    "tile-background": "#fff",
    ...FRAME_LIGHT,
    filter: "none",
  },
  // Muted, dusty greyish-green — calmer than forest, less neutral than
  // silver.
  sage: {
    "primary-color": "#34423a",
    "primary-background": "#e8ebe5",
    "inactive-color": "#8a9888",
    "header-color": "#fff",
    "header-sub-color": "#e8ebe5",
    "header-background": "#34423a",
    "tile-background": "#fff",
    ...FRAME_LIGHT,
    filter: "none",
  },
  // Darker neutral than silver; mid-grey background with a deep-slate
  // header band. Light theme, no photo desaturation.
  slate: {
    "primary-color": "#1e2530",
    "primary-background": "#cdd2d8",
    "inactive-color": "#7a8290",
    "header-color": "#fff",
    "header-sub-color": "#cdd2d8",
    "header-background": "#1e2530",
    "tile-background": "#fff",
    ...FRAME_LIGHT,
    filter: "none",
  },
  // Navy-tinted dark theme — adds chromatic warmth missing from `dark`
  // (charcoal-grey) and `amoled` (pure black).
  midnight: {
    "primary-color": "#e0e8f0",
    "primary-background": "#0e1828",
    "inactive-color": "#5a6878",
    "header-color": "#fff",
    "header-sub-color": "#a8b8c8",
    "header-background": "#1a2840",
    "tile-background": "#1a2840",
    ...FRAME_DARK,
    filter: "none",
  },
  // Warm dark counterpart to midnight — espresso brown tint.
  espresso: {
    "primary-color": "#f0e8e0",
    "primary-background": "#1a120a",
    "inactive-color": "#785a40",
    "header-color": "#fff",
    "header-sub-color": "#c8b8a8",
    "header-background": "#2a1f15",
    "tile-background": "#2a1f15",
    ...FRAME_DARK,
    filter: "none",
  },
};

export type ThemeCategory = "coloured" | "neutral" | "dark" | "statement";

export const THEME_CATEGORIES: ThemeCategory[] = [
  "coloured",
  "neutral",
  "dark",
  "statement",
];

interface ThemeManifestEntry {
  id: ThemeName;
  displayName: string;
  category: ThemeCategory;
}

// Ordered by category (see THEME_CATEGORIES), then alphabetically by
// displayName within each category. The picker renders one <optgroup>
// per category in this order.
const MANIFEST: ThemeManifestEntry[] = [
  { id: "amber", displayName: "Amber", category: "coloured" },
  { id: "blue", displayName: "Blue", category: "coloured" },
  { id: "forest", displayName: "Forest", category: "coloured" },
  { id: "lavender", displayName: "Lavender", category: "coloured" },
  { id: "red", displayName: "Red", category: "coloured" },
  { id: "sage", displayName: "Sage", category: "coloured" },
  { id: "teal", displayName: "Teal", category: "coloured" },
  { id: "grayscale", displayName: "Grayscale", category: "neutral" },
  { id: "contrast", displayName: "High Contrast", category: "neutral" },
  { id: "paper", displayName: "Paper", category: "neutral" },
  { id: "silver", displayName: "Silver", category: "neutral" },
  { id: "slate", displayName: "Slate", category: "neutral" },
  { id: "amoled", displayName: "AMOLED", category: "dark" },
  { id: "dark", displayName: "Dark", category: "dark" },
  { id: "espresso", displayName: "Espresso", category: "dark" },
  { id: "midnight", displayName: "Midnight", category: "dark" },
  { id: "showcase", displayName: "Showcase", category: "dark" },
  { id: "alert", displayName: "Alert", category: "statement" },
];

const isThemeName = (name: string): name is ThemeName => name in THEMES;
const isThemeKey = (key: string): key is ThemeKey =>
  key in THEMES.blue;

const setTheme = (theme: string) => {
  return {
    get: (name: string): string => {
      if (!isThemeName(theme) || !isThemeKey(name)) {
        return "";
      }
      return THEMES[theme][name];
    },
  };
};

export default {
  setTheme,
  manifest: MANIFEST,
};
