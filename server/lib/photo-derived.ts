// Server-side EXIF / dimension derivations. Mirror of the same
// computations PhotoModel.ts performs client-side; ported here so
// the upcoming server-side stats endpoint can group / filter on the
// same fields without round-tripping through the client.
//
// Pure functions of their inputs — no DB access, no logger. Unit
// tests assert parity with the client-side counterparts on a curated
// fixture set; the parity test re-reads PhotoModel.ts via fs to
// catch drift in the constants below (aspect-ratio names + ratios,
// the orientation epsilon).

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CROP_FACTORS = JSON.parse(
  fs.readFileSync(path.join(__dirname, "crop-factors.json"), "utf8")
) as Record<string, number>;

// 15 named aspect ratios. Order matters — `aspectRatio()` walks
// the array and picks the nearest by ratio distance. Keep in sync
// with `react-app/src/models/PhotoModel.ts` (parity-tested).
export const ASPECT_RATIOS: ReadonlyArray<{ name: string; ratio: number }> = [
  { name: "1:1", ratio: 1 / 1 },
  { name: "7:6", ratio: 7 / 6 },
  { name: "5:4", ratio: 5 / 4 },
  { name: "11:8.5", ratio: 11 / 8.5 },
  { name: "4:3", ratio: 4 / 3 },
  { name: "7:5", ratio: 7 / 5 },
  { name: "3:2", ratio: 3 / 2 },
  { name: "14:9", ratio: 14 / 9 },
  { name: "16:10", ratio: 16 / 10 },
  { name: "16:9", ratio: 16 / 9 },
  { name: "1.85.1", ratio: 1.85 / 1 },
  { name: "2:1", ratio: 2 / 1 },
  { name: "2.35:1", ratio: 2.35 / 1 },
  { name: "65:24", ratio: 65 / 24 },
  { name: "3:1+", ratio: 3 / 1 },
];

const ORIENTATION_SQUARE_EPSILON = 0.01;

// Round to nearest 0.5. Both EV and LV bucket on this grid.
const halfStep = (value: number): number => Math.round(value * 2) / 2;

// Formatted gear label. Used for the `camera` and `lens` stats
// categories. Returns undefined when both inputs are missing —
// mirrors `format.gear` on the client.
export const formatGear = (
  make?: string | null,
  model?: string | null
): string | undefined => {
  const m = make ?? undefined;
  const mo = model ?? undefined;
  if (!m && !mo) return undefined;
  if (!m) return mo;
  if (!mo) return m;
  if (mo.startsWith(m)) return mo;
  return `${m} ${mo}`;
};

// 35mm-equivalent focal length: prefer EXIF when present, else
// derive via the crop-factors lookup keyed by `<make> <model>`.
// Undefined when the body is unknown or no focal length recorded —
// the field stays sparse rather than guessed.
export const focalLength35mmEquiv = (
  focalLength: number | undefined | null,
  cameraMake: string | undefined | null,
  cameraModel: string | undefined | null,
  explicit?: number | null
): number | undefined => {
  if (explicit) return explicit;
  if (!focalLength) return undefined;
  if (!cameraMake || !cameraModel) return undefined;
  const factor = CROP_FACTORS[`${cameraMake} ${cameraModel}`];
  if (factor === undefined) return undefined;
  return Math.round(focalLength * factor);
};

// EV = log2(f² / t). Undefined when either input is missing.
export const exposureValue = (
  aperture: number | undefined | null,
  exposureTime: number | undefined | null
): number | undefined => {
  if (!aperture || !exposureTime) return undefined;
  return halfStep(Math.log2((aperture * aperture) / exposureTime));
};

// LV = EV + log2(ISO / 100). Undefined when EV or ISO is missing.
export const lightValue = (
  aperture: number | undefined | null,
  exposureTime: number | undefined | null,
  iso: number | undefined | null
): number | undefined => {
  if (!aperture || !exposureTime || !iso) return undefined;
  const ev = Math.log2((aperture * aperture) / exposureTime);
  return halfStep(ev + Math.log2(iso / 100));
};

// Megapixels, rounded to nearest integer.
export const resolution = (
  width: number | undefined | null,
  height: number | undefined | null
): number => {
  if (!width || !height) return 0;
  return Math.round((width * height) / 1_000_000);
};

// Portrait / square / landscape classification. Square is within
// 1% of 1:1 either way.
export const orientation = (
  width: number | undefined | null,
  height: number | undefined | null
): "portrait" | "square" | "landscape" => {
  if (!width || !height) return "landscape";
  const ratio = width / height;
  if (Math.abs(ratio - 1) < ORIENTATION_SQUARE_EPSILON) return "square";
  if (ratio < 1) return "portrait";
  return "landscape";
};

// Closest named aspect ratio. Ratio is always >= 1 (the long side
// over the short side), so portrait + landscape map to the same
// bucket. Returns undefined for missing dimensions; "" only as a
// safety fallback if the walk somehow exhausts (kept to mirror the
// client's behaviour).
export const aspectRatio = (
  width: number | undefined | null,
  height: number | undefined | null
): string | undefined => {
  if (!width || !height) return undefined;
  const longSide = Math.max(width, height);
  const shortSide = Math.min(width, height);
  const ratio = longSide / shortSide;
  if (!Number.isFinite(ratio)) return undefined;
  for (let i = 0; i < ASPECT_RATIOS.length; i++) {
    const current = ASPECT_RATIOS[i];
    if (i === ASPECT_RATIOS.length - 1) return current.name;
    if (ratio <= current.ratio) return current.name;
    const next = ASPECT_RATIOS[i + 1];
    if (
      ratio < next.ratio &&
      ratio - current.ratio <= next.ratio - ratio
    ) {
      return current.name;
    }
  }
  return "";
};

// Day of week (0 = Sunday, 6 = Saturday) for the given calendar
// date. Matches `new Date(y, m-1, d).getDay()` on the client.
export const weekday = (
  year: number,
  month: number,
  day: number
): number => new Date(year, month - 1, day).getDay();
