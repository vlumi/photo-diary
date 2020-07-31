/* istanbul ignore file */
import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import config from "./config";

const resources = {
  en: require("./translations/en.json"),
  fi: require("./translations/fi.json"),
  ja: require("./translations/ja.json"),
};

i18n.use(initReactI18next).init({
  resources,
  lng: config.DEFAULT_LANGUAGE,

  keySeparator: false,

  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
