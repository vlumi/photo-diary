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

      "years-short": "{{count}}y",
      "months-short": "{{count}}m",
      "days-short": "{{count}}d",

      "years-long": "{{count}} year",
      "years-long_plural": "{{count}} years",
      "months-long": "{{count}} month",
      "months-long_plural": "{{count}} months",
      "days-long": "{{count}} day",
      "days-long_plural": "{{count}} days",
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

      "years-short": "{{count}} v",
      "months-short": "{{count}} kk",
      "days-short": "{{count}} pv",

      "years-long": "{{count}} vuosi",
      "years-long_plural": "{{count}} vuotta",
      "months-long": "{{count}} kuukausi",
      "months-long_plural": "{{count}} kuukautta",
      "days-long": "{{count}} päivä",
      "days-long_plural": "{{count}} päivää",
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

      "years-short": "{{count}}歳",
      "months-short": "{{count}}ヶ月",
      "days-short": "{{count}}日",

      "years-long": "{{count}}歳",
      "months-long": "{{count}}ヶ月",
      "days-long": "{{count}}日",
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
