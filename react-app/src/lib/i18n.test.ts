import { describe, test, expect, beforeAll } from "vitest";
import i18next, { type i18n as I18nType } from "i18next";

import en from "./translations/en.json";
import fi from "./translations/fi.json";
import ja from "./translations/ja.json";

const locales = { en, fi, ja } as const;
type LocaleCode = keyof typeof locales;
const localeCodes = Object.keys(locales) as LocaleCode[];

const keysOf = (code: LocaleCode) =>
  Object.keys(locales[code].translation).sort();

describe("translation key sets", () => {
  test("en and fi share the same keys", () => {
    expect(keysOf("fi")).toEqual(keysOf("en"));
  });
  test("en and ja share the same keys", () => {
    expect(keysOf("ja")).toEqual(keysOf("en"));
  });
});

describe("plural suffix convention", () => {
  // i18next v4 (default since 21+) uses CLDR `_one`/`_other` suffixes.
  // A leftover `_plural` key would silently fall back to the unsuffixed key
  // and render "2 year" / "3 photo" — the exact bug this guards against.
  test.each(localeCodes)("no `_plural` keys remain in %s", (code) => {
    const offenders = keysOf(code).filter((k) => k.endsWith("_plural"));
    expect(offenders).toEqual([]);
  });
});

describe("plural resolution via i18next", () => {
  let i18n: I18nType;
  beforeAll(async () => {
    i18n = i18next.createInstance();
    await i18n.init({
      resources: locales,
      lng: "en",
      fallbackLng: "en",
      keySeparator: false,
      interpolation: { escapeValue: false },
    });
  });

  test("en: singular vs plural diverge for photo-count", async () => {
    await i18n.changeLanguage("en");
    expect(i18n.t("photo-count", { count: 1 })).toBe("1 photo");
    expect(i18n.t("photo-count", { count: 2 })).toBe("2 photos");
  });
  test("en: singular vs plural diverge for years-long", async () => {
    await i18n.changeLanguage("en");
    expect(i18n.t("years-long", { count: 1 })).toBe("1 year");
    expect(i18n.t("years-long", { count: 5 })).toBe("5 years");
  });
  test("fi: singular vs plural diverge for photo-count", async () => {
    await i18n.changeLanguage("fi");
    expect(i18n.t("photo-count", { count: 1 })).toBe("1 kuva");
    expect(i18n.t("photo-count", { count: 2 })).toBe("2 kuvaa");
  });
  test("ja: no plural distinction (CLDR has only `_other` for ja)", async () => {
    await i18n.changeLanguage("ja");
    expect(i18n.t("photo-count", { count: 1 })).toBe("1枚");
    expect(i18n.t("photo-count", { count: 2 })).toBe("2枚");
  });
  test("fallbackLng: missing key in non-en locale falls back to en", async () => {
    const probe = i18next.createInstance();
    await probe.init({
      resources: {
        en: { translation: { greeting: "hello" } },
        ja: { translation: {} },
      },
      lng: "ja",
      fallbackLng: "en",
      keySeparator: false,
    });
    expect(probe.t("greeting")).toBe("hello");
  });
});
