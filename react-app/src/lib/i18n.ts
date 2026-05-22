/* istanbul ignore file */
import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import config from "./config";
import en from "./translations/en.json";
import fi from "./translations/fi.json";
import ja from "./translations/ja.json";

const resources = { en, fi, ja };

i18n.use(initReactI18next).init({
  resources,
  lng: config.DEFAULT_LANGUAGE,
  fallbackLng: "en",

  keySeparator: false,

  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
