let theme = "bw";
const THEMES = {
  blue: {
    "primary-color": "#004",
    "primary-background": "#ddf",
    "inactive-color": "#99b",
    "header-color": "#fff",
    "header-sub-color": "#ddf",
    "header-background": "#004",
    filter: "",
    // TODO: remove
    "none-color": "#ddf",
    "low-color": "#cce",
    "medium-color": "#bbd",
    "high-color": "#aac",
    "extreme-color": "#99b",
  },
  red: {
    "primary-color": "#400",
    "primary-background": "#fdd",
    "inactive-color": "#b99",
    "header-color": "#fff",
    "header-sub-color": "#fdd",
    "header-background": "#400",
    filter: "",
    // TODO: remove
    "none-color": "#fdd",
    "low-color": "#ecc",
    "medium-color": "#dbb",
    "high-color": "#caa",
    "extreme-color": "#b99",
  },
  grayscale: {
    "primary-color": "#444",
    "primary-background": "#ddd",
    "inactive-color": "#999",
    "header-color": "#fff",
    "header-sub-color": "#ddd",
    "header-background": "#444",
    filter: "grayscale(100%)",
    // TODO: remove
    "none-color": "#fff",
    "low-color": "#eee",
    "medium-color": "#ddd",
    "high-color": "#ccc",
    "extreme-color": "#bbb",
  },
  bw: {
    "primary-color": "#000",
    "primary-background": "#ddd",
    "inactive-color": "#999",
    "header-color": "#fff",
    "header-sub-color": "#ddd",
    "header-background": "#000",
    filter: "grayscale(100%)",
    // TODO: remove
    "none-color": "#fff",
    "low-color": "#eee",
    "medium-color": "#ddd",
    "high-color": "#ccc",
    "extreme-color": "#bbb",
  },
  alert: {
    "primary-color": "#f00",
    "primary-background": "#ff6",
    "inactive-color": "#999",
    "header-color": "#ff6",
    "header-sub-color": "#ddd",
    "header-background": "#f00",
    filter: "",
    // TODO: remove
    "none-color": "#fff",
    "low-color": "#eee",
    "medium-color": "#ddd",
    "high-color": "#ccc",
    "extreme-color": "#bbb",
  },
};

const setTheme = (newTheme) => {
  if (newTheme in THEMES) {
    theme = newTheme;
  }
};
const get = (name) => {
  if (!(theme in THEMES) || !(name in THEMES[theme])) {
    return "";
  }
  return THEMES[theme][name];
};

export default {
  setTheme,
  get,
};
