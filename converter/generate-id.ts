import path from "node:path";
import fs from "node:fs";
import { randomUUID } from "node:crypto";
import exifr from "exifr";

// `<YYYY-MM-DDTHH-MM-SS>-<8-hex>.<ext>`. Timestamp from EXIF
// DateTimeOriginal (fallback CreateDate, then file mtime). UUID
// portion disambiguates same-second captures. `:` would be illegal
// on Windows filesystems and ambiguous in URLs, so `T` and `-`
// stand in throughout.
const formatTimestamp = (date: Date): string => {
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}-${pad(date.getMinutes())}-${pad(date.getSeconds())}`
  );
};

export default async (filePath: string): Promise<string> => {
  let timestamp: Date | undefined;
  try {
    const exif = (await exifr.parse(filePath, {
      pick: ["DateTimeOriginal", "CreateDate"],
    })) as { DateTimeOriginal?: Date; CreateDate?: Date } | undefined;
    const t = exif?.DateTimeOriginal ?? exif?.CreateDate;
    if (t instanceof Date && !Number.isNaN(t.getTime())) {
      timestamp = t;
    }
  } catch {
    // exifr throws on EXIF-less files; fall through to mtime.
  }
  if (!timestamp) {
    timestamp = (await fs.promises.stat(filePath)).mtime;
  }
  const ts = formatTimestamp(timestamp);
  const ext = path.extname(filePath).toLowerCase();
  const uuid = randomUUID().slice(0, 8);
  return `${ts}-${uuid}${ext}`;
};
