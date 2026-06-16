import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

// GEOCODE_DIR must be set before reverse-geocode loads so its
// `geocodeDir()` resolves at import time. Use a unique tmp dir
// per test run so concurrent runs don't collide.
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "geocode-cache-"));
process.env.GEOCODE_DIR = tmpDir;

const { geocode } = await import("../reverse-geocode/index.js");

const writeCacheFile = (
  lat: number,
  lon: number,
  lang: string,
  contents: unknown
) => {
  const dir = path.join(tmpDir, "cache", lang);
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${lat.toFixed(4)}:${lon.toFixed(4)}.json`);
  fs.writeFileSync(file, JSON.stringify(contents), "utf8");
};

before(() => {});
after(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test("readCache: old-shape file (extracted struct, no stateCode) re-extracts stateCode from embedded address", async () => {
  // Pre-`f722826` cache format: top-level countryCode + city +
  // address, no stateCode field. Address blob contains the
  // ISO3166-2-lvl4 code Nominatim returned.
  writeCacheFile(35.5441, 139.5730, "en", {
    countryCode: "jp",
    city: "Yokohama",
    address: {
      city: "Yokohama",
      country_code: "jp",
      "ISO3166-2-lvl4": "JP-14",
    },
  });
  const result = await geocode(35.5441, 139.5730, "en");
  assert.ok(result, "expected a result from cache");
  assert.equal(result.stateCode, "JP-14");
  assert.equal(result.countryCode, "jp");
  assert.equal(result.city, "Yokohama");
});

test("readCache: new-shape file (raw Nominatim response) extracts every field", async () => {
  // Post-fix cache stores the raw response — just an `address`
  // at top level. The same `extract` runs on every read.
  writeCacheFile(35.6762, 139.6503, "en", {
    address: {
      city: "Tokyo",
      country_code: "jp",
      "ISO3166-2-lvl4": "JP-13",
    },
  });
  const result = await geocode(35.6762, 139.6503, "en");
  assert.ok(result, "expected a result from cache");
  assert.equal(result.stateCode, "JP-13");
  assert.equal(result.countryCode, "jp");
  assert.equal(result.city, "Tokyo");
});

test("readCache: file without address returns null", async () => {
  writeCacheFile(0, 0, "en", { not: "an address response" });
  const result = await geocode(0, 0, "en");
  assert.equal(result, null);
});

// Smaller countries publish their primary ISO 3166-2 codes at
// lvl6/7/8 — Estonia (counties = lvl6), Luxembourg (canton = lvl6,
// municipality = lvl7), Liechtenstein (municipality = lvl8). Falls
// through broadest-first so the most generic subdivision wins.
test("stateCode falls through to lvl6 when lvl4 is missing (Estonia)", async () => {
  writeCacheFile(59.4370, 24.7536, "en", {
    address: {
      city: "Tallinn",
      country_code: "ee",
      "ISO3166-2-lvl6": "EE-37",
      "ISO3166-2-lvl7": "EE-784",
    },
  });
  const result = await geocode(59.4370, 24.7536, "en");
  assert.ok(result);
  assert.equal(result.stateCode, "EE-37");
});

test("stateCode falls through to lvl7 when lvl4 + lvl6 missing (Luxembourg)", async () => {
  writeCacheFile(49.6116, 6.1319, "en", {
    address: {
      city: "Luxembourg",
      country_code: "lu",
      "ISO3166-2-lvl7": "LU-LU",
    },
  });
  const result = await geocode(49.6116, 6.1319, "en");
  assert.ok(result);
  assert.equal(result.stateCode, "LU-LU");
});

test("stateCode falls through to lvl8 when only lvl8 present (Liechtenstein)", async () => {
  writeCacheFile(47.1380, 9.5345, "en", {
    address: {
      village: "Rotenboden",
      country_code: "li",
      "ISO3166-2-lvl8": "LI-10",
    },
  });
  const result = await geocode(47.1380, 9.5345, "en");
  assert.ok(result);
  assert.equal(result.stateCode, "LI-10");
});

test("stateCode prefers lvl4 when multiple levels present", async () => {
  writeCacheFile(35.4437, 139.6380, "en", {
    address: {
      city: "Yokohama",
      country_code: "jp",
      "ISO3166-2-lvl4": "JP-14",
      "ISO3166-2-lvl6": "JP-14-XX",
    },
  });
  const result = await geocode(35.4437, 139.6380, "en");
  assert.ok(result);
  assert.equal(result.stateCode, "JP-14");
});
