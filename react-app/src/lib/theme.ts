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
  | "paper";

// Theme variable roles:
//   primary-color        main text / dark accents
//   primary-background   page background
//   inactive-color       muted text and borders (disabled, weekday labels)
//   header-color         text on header bands (top menu, day-title column)
//   header-sub-color     secondary text on header bands
//   header-background    background of header bands
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
    ...FRAME_LIGHT,
    filter: "none",
  },
  // Loud red-on-yellow surface used as a visibility flag for the
  // `:private` gallery. Not a generic style — see project memory.
  alert: {
    "primary-color": "#f00",
    "primary-background": "#ff6",
    "inactive-color": "#999",
    "header-color": "#ff6",
    "header-sub-color": "#ddd",
    "header-background": "#f00",
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
    ...FRAME_LIGHT,
    filter: "none",
  },
};

interface ThemeManifestEntry {
  id: ThemeName;
  displayName: string;
}

const MANIFEST: ThemeManifestEntry[] = [
  { id: "blue", displayName: "Blue" },
  { id: "red", displayName: "Red" },
  { id: "grayscale", displayName: "Grayscale" },
  { id: "contrast", displayName: "High Contrast" },
  { id: "alert", displayName: "Alert" },
  { id: "dark", displayName: "Dark" },
  { id: "amoled", displayName: "AMOLED" },
  { id: "forest", displayName: "Forest" },
  { id: "silver", displayName: "Silver" },
  { id: "showcase", displayName: "Showcase" },
  { id: "teal", displayName: "Teal" },
  { id: "paper", displayName: "Paper" },
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
