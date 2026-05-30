// Per-language acceptance rules for `photo_localized.geocoded_city`.
// Nominatim's `?accept-language=<lang>` falls back to the local OSM
// label when no localized form exists for a place — so a fi query
// can return Japanese kanji, a ja query can return plain Latin, etc.
// Each rule rejects values that clearly aren't in the expected
// script(s); the read merge + write upsert + cleanup tool all use
// `acceptLocalizedCity()` to enforce them uniformly.
//
// Rules are pure configuration. Add a language: drop an entry here.

interface LangRule {
  // Reject if `value` doesn't match `require` (used for scripts the
  // value MUST contain at least one character of).
  require?: RegExp;
  // Reject if `value` matches `forbid` (used to say "no characters
  // outside this whitelist allowed").
  forbid?: RegExp;
}

export const LOCALIZED_CITY_RULES: Record<string, LangRule> = {
  ja: {
    // Must contain at least one CJK char Nominatim ja should return.
    require: /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u,
  },
  fi: {
    // Must be Latin-script: anything outside Latin / Common (digits,
    // punctuation, spaces) / Inherited (diacritics) is rejected. Catches
    // kanji / kana / Cyrillic / Hangul leaking through when Nominatim
    // had no Finnish label.
    forbid: /[^\p{Script=Latin}\p{Script=Common}\p{Script=Inherited}]/u,
  },
};

export const acceptLocalizedCity = (
  value: string | null | undefined,
  lang: string
): boolean => {
  if (!value) return true;
  const rule = LOCALIZED_CITY_RULES[lang];
  if (!rule) return true;
  if (rule.require && !rule.require.test(value)) return false;
  if (rule.forbid && rule.forbid.test(value)) return false;
  return true;
};

export const RULED_LANGS = Object.keys(LOCALIZED_CITY_RULES);
