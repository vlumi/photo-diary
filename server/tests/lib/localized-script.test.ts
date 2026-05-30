import { describe, test, expect } from "vitest";

import {
  acceptLocalizedCity,
  RULED_LANGS,
} from "../../lib/localized-script.js";

describe("acceptLocalizedCity", () => {
  test("null / undefined / empty pass through (treated as missing, not bad)", () => {
    expect(acceptLocalizedCity(null, "ja")).toBe(true);
    expect(acceptLocalizedCity(undefined, "ja")).toBe(true);
    expect(acceptLocalizedCity("", "ja")).toBe(true);
  });

  test("unknown lang accepts anything", () => {
    expect(acceptLocalizedCity("Helsinki", "sv")).toBe(true);
    expect(acceptLocalizedCity("東京", "sv")).toBe(true);
  });

  describe("ja: must contain Japanese script", () => {
    test("kanji accepted", () => {
      expect(acceptLocalizedCity("東京都", "ja")).toBe(true);
      expect(acceptLocalizedCity("京都市", "ja")).toBe(true);
    });
    test("hiragana accepted", () => {
      expect(acceptLocalizedCity("ひろしま", "ja")).toBe(true);
    });
    test("katakana accepted", () => {
      expect(acceptLocalizedCity("ヘルシンキ", "ja")).toBe(true);
    });
    test("Latin-only rejected", () => {
      expect(acceptLocalizedCity("Helsinki", "ja")).toBe(false);
      expect(acceptLocalizedCity("Stockholm", "ja")).toBe(false);
    });
    test("Cyrillic-only rejected", () => {
      expect(acceptLocalizedCity("Москва", "ja")).toBe(false);
    });
    test("mixed kanji + Latin accepted (the kanji satisfies the rule)", () => {
      expect(acceptLocalizedCity("東京 (Tokyo)", "ja")).toBe(true);
    });
  });

  describe("fi: must be Latin-script only", () => {
    test("Latin accepted", () => {
      expect(acceptLocalizedCity("Helsinki", "fi")).toBe(true);
      expect(acceptLocalizedCity("Espoo", "fi")).toBe(true);
    });
    test("accented Latin accepted", () => {
      expect(acceptLocalizedCity("Pohjois-Pohjanmaa", "fi")).toBe(true);
      expect(acceptLocalizedCity("Côte d'Azur", "fi")).toBe(true);
    });
    test("kanji rejected", () => {
      expect(acceptLocalizedCity("東京都", "fi")).toBe(false);
      expect(acceptLocalizedCity("新宿区", "fi")).toBe(false);
    });
    test("Cyrillic rejected", () => {
      expect(acceptLocalizedCity("Москва", "fi")).toBe(false);
    });
    test("mixed Latin + kanji rejected", () => {
      expect(acceptLocalizedCity("Tokyo 東京", "fi")).toBe(false);
    });
  });

  test("RULED_LANGS lists every configured language", () => {
    expect(RULED_LANGS).toContain("ja");
    expect(RULED_LANGS).toContain("fi");
  });
});
