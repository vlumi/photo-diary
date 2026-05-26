import path from "node:path";
import fs from "node:fs";
import { randomUUID } from "node:crypto";
import exifr from "exifr";

// `<YYYY-MM-DDTHH-MM-SS>-<8-hex>.<ext>`. Timestamp from EXIF
// DateTimeOriginal (fallback CreateDate, then file mtime). UUID
// portion disambiguates same-second captures. `:` would be illegal
// on Windows filesystems and ambiguous in URLs, so `T` and `-`
// stand in throughout.
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
    const exif = (await exifr.parse(filePath, {
      pick: ["DateTimeOriginal", "CreateDate"],
    })) as { DateTimeOriginal?: Date; CreateDate?: Date } | undefined;
    const t = exif?.DateTimeOriginal ?? exif?.CreateDate;
    if (t instanceof Date && !Number.isNaN(t.getTime())) {
      exifDate = t;
    }
  } catch {
    // exifr throws on EXIF-less files; fall through to mtime.
  }
  const timestamp =
    exifDate ?? (await fs.promises.stat(filePath)).mtime;
  const ext = path.extname(filePath).toLowerCase();
  const uuid = randomUUID().slice(0, 8);
  return {
    id: `${formatIdTimestamp(timestamp)}-${uuid}${ext}`,
    exifTimestamp: exifDate ? formatDbTimestamp(exifDate) : null,
  };
};
