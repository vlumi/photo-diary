// Nominatim returns administrative names ("Stockholm Municipality",
// "City of Westminster") rather than the common form people actually
// use. Normalization strips clearly-administrative suffixes / prefixes
// and applies a small override map for non-pattern fixes.
//
// Rules deliberately conservative — over-stripping risks turning real
// place names ("Lake District") into garbage. Add patterns / overrides
// only when the cruft is observed in actual data; rerun
// `bin/photo.ts normalize-cities --apply` to backfill.

const SUFFIX_STRIPS: RegExp[] = [
  /\s+Municipality$/i,
];

const OVERRIDES: Record<string, string> = {};

export const normalizeCity = <T extends string | null | undefined>(
  raw: T
): T => {
  if (!raw) return raw;
  const override = OVERRIDES[raw];
  if (override !== undefined) return override as T;
  let s: string = raw;
  for (const pattern of SUFFIX_STRIPS) {
    s = s.replace(pattern, "");
  }
  s = s.trim();
  return (s.length > 0 ? s : raw) as T;
};
