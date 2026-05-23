type ThemeName =
  | "blue"
  | "red"
  | "grayscale"
  | "bw"
  | "alert"
  | "dark"
  | "amoled"
  | "sepia"
  | "forest"
  | "silver"
  | "showcase";

// Theme variable roles:
//   primary-color       main text / dark accents on light backgrounds
//   primary-background  page background
//   inactive-color      muted text and borders (disabled, weekday labels, etc)
//   header-color        text on header bands (top menu, day-title column)
//   header-sub-color    secondary text on header bands (weekday short labels under day numbers)
//   header-background   background of header bands
//   filter              CSS filter applied to the photos themselves (grayscale, sepia, ...)
type ThemeKey =
  | "primary-color"
  | "primary-background"
  | "inactive-color"
  | "header-color"
  | "header-sub-color"
  | "header-background"
  | "filter";
type Theme = Record<ThemeKey, string>;

const THEMES: Record<ThemeName, Theme> = {
  blue: {
    "primary-color": "#004",
    "primary-background": "#ddf",
    "inactive-color": "#99b",
    "header-color": "#fff",
    "header-sub-color": "#ddf",
    "header-background": "#004",
    filter: "none",
  },
  red: {
    "primary-color": "#400",
    "primary-background": "#fdd",
    "inactive-color": "#b99",
    "header-color": "#fff",
    "header-sub-color": "#fdd",
    "header-background": "#400",
    filter: "none",
  },
  grayscale: {
    "primary-color": "#444",
    "primary-background": "#ddd",
    "inactive-color": "#999",
    "header-color": "#fff",
    "header-sub-color": "#ddd",
    "header-background": "#444",
    filter: "grayscale(100%)",
  },
  bw: {
    "primary-color": "#000",
    "primary-background": "#ddd",
    "inactive-color": "#999",
    "header-color": "#fff",
    "header-sub-color": "#ddd",
    "header-background": "#000",
    filter: "grayscale(100%)",
  },
  alert: {
    "primary-color": "#f00",
    "primary-background": "#ff6",
    "inactive-color": "#999",
    "header-color": "#ff6",
    "header-sub-color": "#ddd",
    "header-background": "#f00",
    filter: "none",
  },
  dark: {
    "primary-color": "#e0e0e0",
    "primary-background": "#1a1a1a",
    "inactive-color": "#666",
    "header-color": "#fff",
    "header-sub-color": "#aaa",
    "header-background": "#2a2a2a",
    filter: "none",
  },
  amoled: {
    "primary-color": "#fff",
    "primary-background": "#000",
    "inactive-color": "#555",
    "header-color": "#fff",
    "header-sub-color": "#aaa",
    "header-background": "#000",
    filter: "none",
  },
  sepia: {
    "primary-color": "#4a3a2a",
    "primary-background": "#f5e6d3",
    "inactive-color": "#b09a85",
    "header-color": "#f5e6d3",
    "header-sub-color": "#d4c4ad",
    "header-background": "#4a3a2a",
    filter: "sepia(80%)",
  },
  forest: {
    "primary-color": "#1e3a2a",
    "primary-background": "#e8f0e6",
    "inactive-color": "#8aa098",
    "header-color": "#fff",
    "header-sub-color": "#e8f0e6",
    "header-background": "#1e3a2a",
    filter: "none",
  },
  silver: {
    "primary-color": "#2a3540",
    "primary-background": "#e8ebef",
    "inactive-color": "#8a95a0",
    "header-color": "#fff",
    "header-sub-color": "#e8ebef",
    "header-background": "#2a3540",
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
  { id: "bw", displayName: "Black & White" },
  { id: "alert", displayName: "Alert" },
  { id: "dark", displayName: "Dark" },
  { id: "amoled", displayName: "AMOLED" },
  { id: "sepia", displayName: "Sepia" },
  { id: "forest", displayName: "Forest" },
  { id: "silver", displayName: "Silver" },
  { id: "showcase", displayName: "Showcase" },
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
