import { create } from "zustand";
import countryData from "i18n-iso-countries";

import config from "../lib/config";
import format from "../lib/format";
import i18n from "../lib/i18n";

type CountryLocale = Parameters<typeof countryData.registerLocale>[0];

// Country-name locales are loaded on demand so the main bundle ships only
// the active language. Static imports of all three would pull ~21 kB raw
// (~6 kB gz) of dictionaries into the main chunk; dynamic imports give each
// language its own chunk that's fetched when the user activates it.
const countryLoaders: Record<string, () => Promise<{ default: CountryLocale }>> = {
  en: () => import("i18n-iso-countries/langs/en.json"),
  fi: () => import("i18n-iso-countries/langs/fi.json"),
  ja: () => import("i18n-iso-countries/langs/ja.json"),
};
const loadedLocales = new Set<string>();

const loadCountryData = async (lang: string) => {
  const loader = countryLoaders[lang] ?? countryLoaders.en;
  if (!loadedLocales.has(lang)) {
    const mod = await loader();
    countryData.registerLocale(mod.default);
    loadedLocales.add(lang);
  }
  return countryData;
};

// `localStorage` is guarded for test environments / SSR where it may not
// be defined when the module first loads.
const storedLang =
  typeof window !== "undefined" && window.localStorage
    ? window.localStorage.getItem("lang")
    : null;
const initialLang = storedLang ?? config.DEFAULT_LANGUAGE;

interface LangState {
  lang: string;
  countryData: typeof countryData | undefined;
  setLang: (lang: string) => void;
}

export const useLangStore = create<LangState>((set) => ({
  lang: initialLang,
  countryData: undefined,
  setLang: (lang) => {
    set({ lang });
    window.localStorage.setItem("lang", lang);
    if (i18n.language !== lang) {
      i18n.changeLanguage(lang);
    }
    loadCountryData(lang).then((data) => set({ countryData: data }));
    format.loadSubdivisions(lang);
    format.loadCities(lang);
  },
}));

// Bootstrap on first import: align i18next with the persisted choice and
// kick off the country-data load for the initial language so subviews don't
// see `countryData === undefined` after the first paint completes.
if (i18n.language !== initialLang) {
  i18n.changeLanguage(initialLang);
}
loadCountryData(initialLang).then((data) => {
  useLangStore.setState({ countryData: data });
});
// `en` is the lookup fallback, so always load it.
format.loadSubdivisions("en");
format.loadCities("en");
if (initialLang !== "en") {
  format.loadSubdivisions(initialLang);
  format.loadCities(initialLang);
}

// If anything else changes the language out-of-band (e.g. an i18next
// language detector plugin in the future), mirror it into the store so the
// UI stays in sync.
i18n.on("languageChanged", (next) => {
  if (useLangStore.getState().lang !== next) {
    useLangStore.getState().setLang(next);
  }
});
