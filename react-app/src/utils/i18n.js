import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import config from "./config";

// the translations
// (tip move them in a JSON file and import them)
const resources = {
  en: {
    translation: {
      "weekday-short-mon": "Mon",
      "weekday-short-tue": "Tue",
      "weekday-short-wed": "Wed",
      "weekday-short-thu": "Thu",
      "weekday-short-fri": "Fri",
      "weekday-short-sat": "Sat",
      "weekday-short-sun": "Sun",

      "date-ymd": "{year}-{month}-{day}",
      "date-ym": "{year}-{month}",
      "date-y": "{year}",
    },
  },
  fi: {
    translation: {
      "weekday-short-mon": "ma",
      "weekday-short-tue": "ti",
      "weekday-short-wed": "ke",
      "weekday-short-thu": "to",
      "weekday-short-fri": "pe",
      "weekday-short-sat": "la",
      "weekday-short-sun": "su",

      "date-ymd": "{year}-{month}-{day}",
      "date-ym": "{year}-{month}",
      "date-y": "{year}",
    },
  },
  ja: {
    translation: {
      "weekday-short-mon": "月",
      "weekday-short-tue": "火",
      "weekday-short-wed": "水",
      "weekday-short-thu": "木",
      "weekday-short-fri": "金",
      "weekday-short-sat": "土",
      "weekday-short-sun": "日",
      "date-ymd": "{year}年{month}月{day}日",
      "date-ym": "{year}年{month}月",
      "date-y": "{year}年",
    },
  },
};

i18n
  .use(initReactI18next) // passes i18n down to react-i18next
  .init({
    resources,
    lng: config.DEFAULT_LANGUAGE,

    keySeparator: false, // we do not use keys in form messages.welcome

    interpolation: {
      escapeValue: false, // react already safes from xss
    },
  });

export default i18n;
