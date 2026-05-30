// Nominatim returns administrative names — sometimes English admin
// suffixes ("Stockholm Municipality"), sometimes the local-language
// form even on en queries ("Göteborgs Stad", "Norrtälje kommun",
// "Stadtgebiet Bremen"). Normalization strips clearly-administrative
// patterns and applies a small override map for non-pattern fixes
// (anglicized exonyms, possessive forms whose pattern is ambiguous).
//
// Rules deliberately conservative — over-stripping risks mangling
// real place names (e.g. "Lake District", or Swedish names ending
// in 's' like Borås). Add patterns / overrides only when the cruft
// is observed in actual data; rerun
// `bin/photo.ts normalize-cities --apply` to backfill.

const SUFFIX_STRIPS: RegExp[] = [
  /\s+Municipality$/i, // "Stockholm Municipality"
  /\s+kommun$/i, // "Norrtälje kommun" (Swedish)
  /\s+stad$/i, // "Malmö stad" (Swedish/Nordic; Stad also matches)
];

const PREFIX_STRIPS: RegExp[] = [
  /^Stadtgebiet\s+/i, // "Stadtgebiet Bremen" (German city-state area)
];

// Explicit overrides — applied before pattern strips. Use for
// possessive-form Swedish names (where a generic regex would mangle
// the trailing 's'), anglicized exonyms, and any name whose pattern
// can't be generalized safely. Lookup is case-insensitive.
const OVERRIDES: Record<string, string> = {
  "Göteborgs Stad": "Gothenburg",
};
const OVERRIDES_LC: Record<string, string> = Object.fromEntries(
  Object.entries(OVERRIDES).map(([k, v]) => [k.toLowerCase(), v])
);

export const normalizeCity = <T extends string | null | undefined>(
  raw: T
): T => {
  if (!raw) return raw;
  const override = OVERRIDES_LC[raw.toLowerCase()];
  if (override !== undefined) return override as T;
  let s: string = raw;
  for (const pattern of PREFIX_STRIPS) {
    s = s.replace(pattern, "");
  }
  for (const pattern of SUFFIX_STRIPS) {
    s = s.replace(pattern, "");
  }
  s = s.trim();
  return (s.length > 0 ? s : raw) as T;
};
