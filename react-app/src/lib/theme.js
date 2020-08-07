const THEMES = {
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
};

const setTheme = (theme) => {
  return {
    get: (name) => {
      if (!(theme in THEMES) || !(name in THEMES[theme])) {
        return "";
      }
      return THEMES[theme][name];
    },
  };
};

export default {
  setTheme,
};
