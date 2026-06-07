// User-assigned ISO 3166 code for "no country" — operator-applied
// to photos taken in international waters or otherwise outside any
// nation's territory. Distinct from "country slot is empty" (which
// the audit still flags as missing-country): the sentinel is a
// deliberate value the operator picks to silence the audit.
//
// Matches the server's `server/lib/photo-filter.ts` COUNTRY_SENTINEL.
// Stored lowercase like every other country code; comparisons are
// case-insensitive.
export const COUNTRY_SENTINEL = "xx";

export const isCountrySentinel = (
  code: string | null | undefined
): boolean =>
  typeof code === "string" && code.toLowerCase() === COUNTRY_SENTINEL;
