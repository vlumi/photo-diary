import fs from "node:fs";
import path from "node:path";

import { readPackageVersion } from "../lib/version.js";
import * as logger from "../lib/logger.js";
import { normalizeCity } from "./normalize.js";

export { normalizeCity };

// Per Nominatim's usage policy:
//   - Public instance: absolute maximum 1 request per second.
//   - Custom, descriptive User-Agent required.
//   - Caching encouraged.
// https://operations.osmfoundation.org/policies/nominatim/
const DEFAULT_BASE_URL = "https://nominatim.openstreetmap.org";
const MIN_INTERVAL_MS = 1000;
const REPO_URL = "https://github.com/vlumi/photo-diary";

const baseUrl = (): string =>
  (process.env.NOMINATIM_BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/, "");

const userAgent = (): string => {
  try {
    return `photo-diary/${readPackageVersion()} (${REPO_URL})`;
  } catch {
    return `photo-diary (${REPO_URL})`;
  }
};

const geocodeDir = (): string =>
  process.env.GEOCODE_DIR ?? path.join(process.cwd(), ".geocode");

const cacheDirFor = (lang: string): string =>
  path.join(geocodeDir(), "cache", lang);

const cachePathFor = (lat: number, lon: number, lang: string): string => {
  // Rounded to 4 decimals (~11 m) so micro-jitter doesn't bust the cache.
  // The reverse-geocode result is identical for any two points within
  // that radius in practice.
  const key = `${lat.toFixed(4)}:${lon.toFixed(4)}.json`;
  return path.join(cacheDirFor(lang), key);
};

// One-line summary fields extracted from Nominatim's structured response,
// Mirrors the schema columns we still persist. State / district /
// display_name are no longer surfaced from the structured fields —
// state name is derived client-side from `stateCode` via the curated
// subdivision JSON files. The raw `address` blob is kept verbatim
// for replay / re-derivation.
export interface NominatimResult {
  countryCode: string | undefined;
  stateCode: string | undefined;
  city: string | undefined;
  address: Record<string, unknown>;
}

interface NominatimResponse {
  address?: Record<string, unknown>;
}

const extract = (raw: NominatimResponse): NominatimResult | null => {
  const a = raw.address;
  if (!a) return null;
  const get = (key: string): string | undefined => {
    const v = a[key];
    return typeof v === "string" && v ? v : undefined;
  };
  // Nominatim's `city` is country-specific — fall through synonyms
  // so the column gets populated whatever the locale calls it.
  // Normalized to strip admin cruft like "Stockholm Municipality".
  const city = normalizeCity(
    get("city") ??
      get("town") ??
      get("village") ??
      get("municipality") ??
      get("hamlet")
  );
  const countryCode = (() => {
    const cc = a.country_code;
    return typeof cc === "string" ? cc : undefined;
  })();
  const stateCode = (() => {
    const v = a["ISO3166-2-lvl4"];
    return typeof v === "string" && v ? v : undefined;
  })();
  return { countryCode, stateCode, city, address: a };
};

// Tiny serial queue — every fetch waits at least MIN_INTERVAL_MS after the
// previous one started. Single global queue per process; the daemon and
// converter intake share it (both run inside one process at a time per
// the operator workflow).
let nextSlot = 0;
const acquireSlot = async (): Promise<void> => {
  const now = Date.now();
  const wait = Math.max(0, nextSlot - now);
  nextSlot = Math.max(now, nextSlot) + MIN_INTERVAL_MS;
  if (wait > 0) {
    await new Promise((resolve) => setTimeout(resolve, wait));
  }
};

const readCache = (
  lat: number,
  lon: number,
  lang: string
): NominatimResult | null => {
  try {
    const raw = fs.readFileSync(cachePathFor(lat, lon, lang), "utf8");
    return JSON.parse(raw) as NominatimResult;
  } catch {
    return null;
  }
};

const writeCache = (
  lat: number,
  lon: number,
  lang: string,
  result: NominatimResult
): void => {
  const dir = cacheDirFor(lang);
  fs.mkdirSync(dir, { recursive: true });
  // Atomic write so a partial JSON never gets read back as a cache hit.
  const finalPath = cachePathFor(lat, lon, lang);
  const tmpPath = `${finalPath}.${process.pid}.tmp`;
  fs.writeFileSync(tmpPath, JSON.stringify(result), "utf8");
  fs.renameSync(tmpPath, finalPath);
};

// Reverse-geocode `(lat, lon)` in `lang`. Returns null on:
//   - No `address` in Nominatim's response (very rare — usually open
//     ocean or null island).
//   - Network / HTTP failure (logged, but doesn't throw — the caller
//     should treat it as "no data yet, try again later").
export const geocode = async (
  lat: number,
  lon: number,
  lang: string
): Promise<NominatimResult | null> => {
  const cached = readCache(lat, lon, lang);
  if (cached) return cached;

  await acquireSlot();

  const url = new URL(`${baseUrl()}/reverse`);
  url.searchParams.set("lat", String(lat));
  url.searchParams.set("lon", String(lon));
  url.searchParams.set("format", "json");
  url.searchParams.set("zoom", "14"); // suburb / neighbourhood level
  url.searchParams.set("addressdetails", "1");

  let response: Response;
  try {
    response = await fetch(url, {
      headers: {
        "User-Agent": userAgent(),
        "Accept-Language": lang,
      },
    });
  } catch (err) {
    logger.error(`[geocode] ${lat},${lon} (${lang}): network error`, err);
    return null;
  }
  if (!response.ok) {
    logger.error(
      `[geocode] ${lat},${lon} (${lang}): HTTP ${response.status} ${response.statusText}`
    );
    return null;
  }
  const raw = (await response.json()) as NominatimResponse;
  const result = extract(raw);
  if (!result) {
    logger.info(`[geocode] ${lat},${lon} (${lang}): no address in response`);
    return null;
  }
  writeCache(lat, lon, lang, result);
  return result;
};
