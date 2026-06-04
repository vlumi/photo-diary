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
