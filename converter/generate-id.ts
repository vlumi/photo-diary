import path from "node:path";
import fs from "node:fs";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import exifReader from "exif-reader";

// `<YYYY-MM-DDTHH-MM-SS>-<16-hex>.<ext>`. Timestamp from EXIF
// DateTimeOriginal (fallback CreateDate, then file mtime). The
// 16-hex (64-bit) UUID portion disambiguates same-second captures
// and gives `bin/photo-rename.ts --scramble` enough entropy to
// resist brute-force enumeration of leaked URLs. `:` would be
// illegal on Windows filesystems and ambiguous in URLs, so `T`
// and `-` stand in throughout.
const formatIdTimestamp = (date: Date): string => {
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}-${pad(date.getMinutes())}-${pad(date.getSeconds())}`
  );
};

// `YYYY-MM-DD HH:MM:SS` matches the `photo.taken` DB column format
// so the dedup check in process-file can compare strings directly.
const formatDbTimestamp = (date: Date): string => {
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ` +
    `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
  );
};

export interface GenerateIdResult {
  id: string;
  // EXIF DateTimeOriginal in `YYYY-MM-DD HH:MM:SS` form, or null when the
  // file has no EXIF capture timestamp (fell back to mtime). The dedup
  // check in process-file uses this; null disables the check (mtime is
  // not a strong-enough duplicate signal).
  exifTimestamp: string | null;
}

export default async (filePath: string): Promise<GenerateIdResult> => {
  let exifDate: Date | undefined;
  try {
    // Read the EXIF blob via sharp (already a converter dep) and parse
    // with exif-reader — same output shape read-exif.ts uses. Only
    // needs the capture timestamp here, so the extra fields are
    // ignored.
    const meta = await sharp(filePath).metadata();
    if (meta.exif) {
      const parsed = exifReader(meta.exif);
      // Prefer DateTimeOriginal (shutter moment) → DateTimeDigitized
      // (converted-from-analog) → DateTime (file-modified). Same
      // priority the previous exifr call used via its CreateDate alias.
      const t =
        parsed.Photo?.DateTimeOriginal ??
        parsed.Photo?.DateTimeDigitized ??
        parsed.Image?.DateTime;
      if (t instanceof Date && !Number.isNaN(t.getTime())) {
        // exif-reader builds the Date via Date.UTC, so the wall-clock
        // digits live in getUTC*(). Re-encode as a local-time Date so
        // the downstream formatters (`getFullYear` etc.) recover the
        // same digits regardless of runner timezone. The mtime
        // fallback below stays a real instant — its wall-clock IS the
        // user's local time by definition.
        exifDate = new Date(
          t.getUTCFullYear(),
          t.getUTCMonth(),
          t.getUTCDate(),
          t.getUTCHours(),
          t.getUTCMinutes(),
          t.getUTCSeconds()
        );
      }
    }
  } catch {
    // Non-image / corrupt / EXIF-less — fall through to mtime.
  }
  const timestamp =
    exifDate ?? (await fs.promises.stat(filePath)).mtime;
  const ext = path.extname(filePath).toLowerCase();
  // randomUUID() returns `xxxxxxxx-xxxx-...`; strip dashes so we can
  // take exactly 16 hex chars regardless of how they straddle groups.
  const uuid = randomUUID().replace(/-/g, "").slice(0, 16);
  return {
    id: `${formatIdTimestamp(timestamp)}-${uuid}${ext}`,
    exifTimestamp: exifDate ? formatDbTimestamp(exifDate) : null,
  };
};
