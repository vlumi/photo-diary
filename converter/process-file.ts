/* eslint-disable @typescript-eslint/no-explicit-any -- intake JSON is
   untyped operator input; narrowing via `unknown` would force defensive
   guards at every dot-access site without buying us safety. */
import fs from "node:fs";
import path from "node:path";

import db from "photo-diary-server/db/index.js";
import { lookup } from "photo-diary-server/lib/photo-intake.js";

import { DIR_INBOX, DIR_ORIGINAL, TARGETS } from "./lib/constants.js";
import * as logger from "./lib/logger.js";
import extractProperties from "./extract-properties/index.js";
import convertImage from "./convert-image/index.js";
import generateId from "./generate-id.js";
import { geocode } from "./reverse-geocode/index.js";

// Reverse-geocode is opt-in: privacy trade-off, third-party API call
// per new photo. English is always written when enabled (canonical /
// filter-keyed language); REVERSE_GEOCODE_EXTRA_LANGS lists additional
// languages. Each extra adds one 1-RPS Nominatim call per photo at
// intake. Use `bin/photo-geocode.ts` to backfill existing photos or
// add languages later without touching the hot path.
const geocodeAtIntake = async (
  photoId: string,
  lat: number | null | undefined,
  lon: number | null | undefined
): Promise<void> => {
  if (!process.env.REVERSE_GEOCODE) return;
  if (lat === null || lat === undefined) return;
  if (lon === null || lon === undefined) return;
  const extra = (process.env.REVERSE_GEOCODE_EXTRA_LANGS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s && s !== "en");
  const langs = ["en", ...extra];
  for (const lang of langs) {
    const result = await geocode(lat, lon, lang);
    if (!result) {
      await db.markGeocodeNoData(photoId);
      return;
    }
    await db.upsertGeocoded(photoId, lang, {
      countryCode: lang === "en" ? (result.countryCode ?? null) : undefined,
      stateCode: lang === "en" ? (result.stateCode ?? null) : undefined,
      city: result.city ?? null,
      address: JSON.stringify(result.address),
    });
  }
};

// Derive a gallery id from the path's first segment when the file
// arrived under `inbox/<gallery>/...`. Returns null for files in the
// inbox root.
const deriveGallery = (relPath: string): string | null => {
  const parts = relPath.split(path.sep);
  return parts.length > 1 ? parts[0] : null;
};

const validateGallery = async (galleryId: string): Promise<boolean> => {
  try {
    await db.loadGallery(galleryId);
    return true;
  } catch {
    return false;
  }
};

// Return a non-existing path of the form `<base>.json` or
// `<base>.<n>.json` (n=1,2,…) so subsequent intake JSONs for the
// same photo don't overwrite the prior archive — keeps the audit
// trail intact when the operator re-publishes / updates metadata.
const findUniqueIntakePath = async (
  rootDir: string,
  id: string
): Promise<string> => {
  const base = path.join(rootDir, DIR_ORIGINAL, `${id}.intake`);
  for (let n = 0; ; n++) {
    const candidate = n === 0 ? `${base}.json` : `${base}.${n}.json`;
    try {
      await fs.promises.access(candidate);
    } catch {
      return candidate;
    }
  }
};

const linkToGallery = async (photoId: string, galleryId: string | null) => {
  if (!galleryId) return;
  try {
    await db.linkGalleryPhoto([galleryId], [photoId]);
    logger.info(`[${photoId}] Linked to gallery "${galleryId}"`);
  } catch (err) {
    logger.error(`[${photoId}] Linking to "${galleryId}" failed:`, err);
  }
};

const processJpeg = async (
  relPath: string,
  rootDir: string,
  galleryId: string | null
): Promise<void> => {
  const originalFilename = path.basename(relPath);
  const originalPath = path.join(rootDir, DIR_INBOX, relPath);
  const stat = await fs.promises.stat(originalPath);
  if (stat.size === 0) {
    throw `[${relPath}] Skipping empty file`;
  }

  const hrstart = process.hrtime();
  logger.debug(`[${relPath}] Processing`);

  // Rename to a stable id at intake: <YYYY-MM-DDTHH-MM-SS>-<short-uuid>.<ext>
  // from EXIF DateTimeOriginal (fallback mtime). The rest of the pipeline
  // operates on this id; the original camera filename is preserved on the
  // DB row's originalFilename so enrichment JSONs and `bin/photo.ts search`
  // can still find the photo by the human-recognised name.
  const generated = await generateId(originalPath);
  const exifTimestamp = generated.exifTimestamp;

  // Dedup: a row whose originalFilename AND taken.instant.timestamp both
  // match the incoming SOOC's EXIF DateTimeOriginal. Covers LR re-export
  // (overwrite in place) and JSON-first stub (timestamp links them).
  let id = generated.id;
  let isReimport = false;
  if (exifTimestamp) {
    const candidates = (await db.loadPhotosByOriginalFilename(
      originalFilename
    )) as Array<{ id: string; taken?: { instant?: { timestamp?: string } } }>;
    const matched = candidates.find(
      (c) => c.taken?.instant?.timestamp === exifTimestamp
    );
    if (matched) {
      id = matched.id;
      isReimport = true;
      logger.info(
        `[${relPath}] Reusing existing id ${id} (originalFilename + taken match); opinion fields preserved`
      );
    }
  }

  const newInboxPath = path.join(rootDir, DIR_INBOX, id);
  await fs.promises.rename(originalPath, newInboxPath);
  logger.debug(`[${relPath}] Renamed inbox file to ${id}`);

  await Promise.all(
    TARGETS.map((target) => convertImage(id, rootDir, target))
  );

  const properties = await extractProperties(id, rootDir);
  properties.originalFilename = originalFilename;

  if (isReimport) {
    const update = { ...properties };
    delete update.id;
    await db.updatePhoto(id, update);
    logger.debug(`[${relPath}] Refreshed DB row ${id}`);
  } else {
    await db.createPhoto(properties);
    logger.debug(`[${relPath}] Created DB row ${id}`);
  }

  const coords = (
    properties as {
      taken?: {
        location?: {
          coordinates?: { latitude?: number; longitude?: number };
        };
      };
    }
  ).taken?.location?.coordinates;
  await geocodeAtIntake(id, coords?.latitude, coords?.longitude);

  await linkToGallery(id, galleryId);

  // fs.rename overwrites on POSIX; deliberately replaces the prior
  // original/<id>.jpg when re-importing.
  await fs.promises.rename(
    newInboxPath,
    path.join(rootDir, DIR_ORIGINAL, id)
  );

  const hrend = process.hrtime(hrstart);
  const elapsedSeconds =
    Math.round(hrend[0] * 1000 + hrend[1] / 1000000) / 1000;
  logger.info(`[${relPath}] Processed as ${id}, elapsed ${elapsedSeconds}s`);
};

const processJsonSidecar = async (
  relPath: string,
  rootDir: string,
  galleryId: string | null
): Promise<void> => {
  const filePath = path.join(rootDir, DIR_INBOX, relPath);
  logger.debug(`[${relPath}] Processing JSON sidecar`);

  const raw = await fs.promises.readFile(filePath, "utf-8");
  let data: any;
  try {
    data = JSON.parse(raw);
  } catch (err) {
    throw `[${relPath}] JSON parse error: ${(err as Error).message}`;
  }
  // Accept a single photo object or an array; tolerate keyed objects
  // (matching `bin/photo.ts processJson`).
  const photos: any[] = Array.isArray(data)
    ? data
    : "id" in data
      ? [data]
      : (Object.values(data) as any[]);

  let resultId: string | null = null;
  for (const photo of photos) {
    if (!photo.id) {
      logger.error(`[${relPath}] Skipping entry with no id`);
      continue;
    }
    const r = await lookup(photo);
    if (r.kind === "ambiguous") {
      logger.error(
        `[${relPath}] "${photo.id}" matched multiple existing rows; skipping. Resolve via bin/photo.ts.`
      );
      continue;
    }
    if (r.kind === "update") {
      const update = { ...photo };
      delete update.id;
      await db.updatePhoto(r.existingId, update);
      logger.info(`[${relPath}] Updated "${r.existingId}"`);
      resultId = resultId ?? r.existingId;
      await linkToGallery(r.existingId, galleryId);
    } else {
      const create = { ...photo };
      if (!create.originalFilename) create.originalFilename = create.id;
      await db.createPhoto(create);
      logger.info(`[${relPath}] Created "${create.id}"`);
      resultId = resultId ?? create.id;
      await linkToGallery(create.id, galleryId);
    }
  }

  // Move the sidecar out of inbox so it isn't re-processed on restart.
  // Naming: `original/<id>.intake.json`, falling back to `.1.json`,
  // `.2.json`, … if prior intake JSONs for the same photo are already
  // there — keeps audit trail intact across re-publishes.
  if (resultId) {
    await fs.promises.rename(
      filePath,
      await findUniqueIntakePath(rootDir, resultId)
    );
  } else {
    logger.error(
      `[${relPath}] No entries processed; leaving file in place for operator review`
    );
  }
};

export default async (
  relPath: string,
  rootDir: string
): Promise<void> => {
  const galleryId = deriveGallery(relPath);
  if (galleryId && !(await validateGallery(galleryId))) {
    logger.error(
      `[${relPath}] Subdir "${galleryId}" doesn't match any gallery; leaving file in place. Rename or move out of inbox to retry.`
    );
    return;
  }

  if (/\.jpe?g$/i.test(relPath)) {
    await processJpeg(relPath, rootDir, galleryId);
    return;
  }

  if (/\.json$/i.test(relPath)) {
    await processJsonSidecar(relPath, rootDir, galleryId);
    return;
  }

  logger.debug(`[${relPath}] Unsupported extension, ignoring`);
};
