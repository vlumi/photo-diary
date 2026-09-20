import { describe, expect, test } from "vitest";

import type { Photo } from "../../db/sqlite3/schema.js";
import { COUNTRY_SENTINEL, countryMismatch } from "../../lib/photo-filter.js";

// Only the two fields the predicate reads; the rest of a photo is
// irrelevant here.
const mkPhoto = (opts: {
  operatorCountry?: string;
  geocodedCountry?: string;
}): Photo =>
  ({
    taken: opts.operatorCountry
      ? { location: { country: opts.operatorCountry } }
      : undefined,
    geocoded: opts.geocodedCountry
      ? { countryCode: opts.geocodedCountry }
      : undefined,
  }) as unknown as Photo;

describe("countryMismatch", () => {
  test("matches when operator and geocoded differ", () => {
    expect(
      countryMismatch(mkPhoto({ operatorCountry: "fi", geocodedCountry: "se" }))
    ).toBe(true);
  });

  test("no match when both sides agree (case-insensitive)", () => {
    expect(
      countryMismatch(mkPhoto({ operatorCountry: "FI", geocodedCountry: "fi" }))
    ).toBe(false);
  });

  test("flags rows where geocoded is set but operator is empty (backfill candidate)", () => {
    expect(
      countryMismatch(mkPhoto({ geocodedCountry: "fi" }))
    ).toBe(true);
  });

  test("silent when geocoded is empty (geocoder may not have run yet)", () => {
    expect(
      countryMismatch(mkPhoto({ operatorCountry: "fi" }))
    ).toBe(false);
  });

  test("sentinel operator country silences the predicate", () => {
    expect(
      countryMismatch(
        mkPhoto({ operatorCountry: COUNTRY_SENTINEL, geocodedCountry: "fi" })
      )
    ).toBe(false);
  });

  test("sentinel comparison is case-insensitive", () => {
    expect(
      countryMismatch(
        mkPhoto({
          operatorCountry: COUNTRY_SENTINEL.toUpperCase(),
          geocodedCountry: "fi",
        })
      )
    ).toBe(false);
  });
});
