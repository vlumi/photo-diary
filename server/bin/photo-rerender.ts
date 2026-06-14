#!/usr/bin/env -S npx tsx
/* eslint-disable no-console -- interactive CLI tool; console output is the UI */

/**
 * Operator script for the `photo_rendition` table.
 *
 *   photo-rerender.ts                  # scan: register on-disk files
 *   photo-rerender.ts generate <name>  # render missing `<name>/<id>.jpg`
 *                                        from `original/<id>.jpg`
 *   photo-rerender.ts prune            # drop rows whose file is gone
 *
 * Runs from the per-instance directory (`/var/photo-diary/<name>/`),
 * so `photos/` is at `./photos/` and the DB is at `./db.sqlite3`.
 *
 * All modes default to dry-run; pass `--apply` to write. `generate`
 * additionally takes `--force` to overwrite an existing
 * `<name>/<id>.jpg` (useful after bumping the profile's `maxDim` in
 * `/m/instance`).
 *
 * `generate` reads from `original/<id>.jpg`. Originals are often kept
 * off-server; missing originals are skipped with a one-liner per
 * photo, and the run continues. If you have larger renders only on
 * your local machine, run sharp locally and rsync the directory up,
 * then run `photo-rerender.ts` (scan) to register the rows.
 */

import fs from "node:fs";
import path from "node:path";

import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import sharp from "sharp";

import db from "../db/index.js";
import logger from "../lib/logger.js";
import {
  DIR_INBOX,
  DIR_ORIGINAL,
  DIR_THUMBNAIL,
} from "photo-diary-converter/lib/constants.js";
import { loadRenditions } from "photo-diary-converter/lib/renditions.js";

const DIR_PHOTOS = "photos";
// Subdirectories that look like rendition dirs but aren't part of the
// display ladder. Inbox / original / thumbnail have fixed semantics
// and never join `photo_rendition`.
const RESERVED_DIRS = new Set([DIR_INBOX, DIR_ORIGINAL, DIR_THUMBNAIL]);

const photoRoot = path.join(process.cwd(), DIR_PHOTOS);
if (!fs.existsSync(photoRoot)) {
  console.error(
    `No "photos/" directory at ${photoRoot}. Run this from an instance directory.`
  );
  process.exit(1);
}

const sampleMaxDim = async (filePath: string): Promise<number | null> => {
  try {
    const meta = await sharp(filePath).metadata();
    if (!meta.width || !meta.height) return null;
    return Math.max(meta.width, meta.height);
  } catch (err) {
    logger.error(`Failed to read sharp metadata for ${filePath}: ${err}`);
    return null;
  }
};

const listJpegs = (dir: string): string[] => {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => /\.jpe?g$/i.test(f))
    .sort();
};

// Map filename (`<id>.jpg`) → photo id. The DB stores the full
// filename including extension as the id, so this is a straight
// pass-through; kept named for intent.
const filenameToId = (file: string): string => file;

const runScan = async (apply: boolean): Promise<void> => {
  const photos = (await db.loadPhotos()) as Array<{ id: string }>;
  const knownIds = new Set(photos.map((p) => p.id));

  const entries = fs
    .readdirSync(photoRoot, { withFileTypes: true })
    .filter((e) => e.isDirectory() && !RESERVED_DIRS.has(e.name));

  if (entries.length === 0) {
    console.log("No rendition directories under photos/. Nothing to scan.");
    return;
  }

  let inserted = 0;
  let alreadyExists = 0;
  let unknownPhoto = 0;

  for (const entry of entries) {
    const dir = path.join(photoRoot, entry.name);
    const files = listJpegs(dir);
    if (files.length === 0) {
      console.log(`[${entry.name}] empty directory, skipping`);
      continue;
    }
    const sampleDim = await sampleMaxDim(path.join(dir, files[0]));
    if (sampleDim === null) {
      console.log(
        `[${entry.name}] could not read dimensions from ${files[0]}; skipping`
      );
      continue;
    }
    if (files.length > 1) {
      const checkDim = await sampleMaxDim(
        path.join(dir, files[files.length - 1])
      );
      if (checkDim !== null && checkDim !== sampleDim) {
        console.log(
          `[${entry.name}] warning: sampled maxDim differs (${sampleDim} vs ${checkDim}); using ${sampleDim}`
        );
      }
    }

    const existingRowsRaw = await db.loadAllPhotoRenditions();
    const existingRows = existingRowsRaw as Array<{
      photoId: string;
      name: string;
      maxDim: number;
    }>;
    const haveRow = new Set(
      existingRows
        .filter((r) => r.name === entry.name)
        .map((r) => r.photoId)
    );

    for (const file of files) {
      const id = filenameToId(file);
      if (!knownIds.has(id)) {
        console.log(`[${entry.name}] unknown photo: ${id}`);
        unknownPhoto++;
        continue;
      }
      if (haveRow.has(id)) {
        alreadyExists++;
        continue;
      }
      if (apply) {
        await db.upsertPhotoRendition(id, entry.name, sampleDim);
      }
      inserted++;
    }
    console.log(
      `[${entry.name}] maxDim=${sampleDim}, ${files.length} files, ` +
        `${inserted} would-be-inserted / ${alreadyExists} present / ${unknownPhoto} unknown`
    );
    inserted = 0;
    alreadyExists = 0;
    unknownPhoto = 0;
  }

  if (!apply) {
    console.log("\nDry run. Re-run with --apply to write rows.");
  }
};

const runPrune = async (apply: boolean): Promise<void> => {
  const rows = await db.loadAllPhotoRenditions();
  const dangling = rows.filter(
    (r) => !fs.existsSync(path.join(photoRoot, r.name, r.photoId))
  );
  if (dangling.length === 0) {
    console.log("No dangling photo_rendition rows.");
    return;
  }
  for (const r of dangling) {
    console.log(`${r.name}/${r.photoId} (file missing)`);
  }
  console.log(
    `\n${dangling.length} row(s) ${apply ? "deleted" : "would be deleted (dry-run, pass --apply to write)"}.`
  );
  if (apply) {
    for (const r of dangling) {
      await db.deletePhotoRendition(r.photoId, r.name);
    }
  }
};

const runGenerate = async (
  name: string,
  apply: boolean,
  force: boolean
): Promise<void> => {
  const renditions = await loadRenditions();
  const profile = renditions.find((r) => r.name === name);
  if (!profile) {
    console.error(
      `Rendition "${name}" is not configured. Add it to the renditions meta key first ` +
        "(via /m/instance or \"./bin/meta.ts set instance_renditions ...\")."
    );
    process.exit(1);
  }
  if (name === DIR_ORIGINAL || RESERVED_DIRS.has(name)) {
    console.error(`Refusing to generate into reserved directory "${name}".`);
    process.exit(1);
  }

  const outputDir = path.join(photoRoot, name);
  const originalDir = path.join(photoRoot, DIR_ORIGINAL);

  const photos = (await db.loadPhotos()) as Array<{ id: string }>;
  const existingRows = (await db.loadAllPhotoRenditions()).filter(
    (r) => r.name === name
  );
  const haveRow = new Set(existingRows.map((r) => r.photoId));

  let generated = 0;
  let skippedExisting = 0;
  let skippedNoOriginal = 0;

  if (apply) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  for (const photo of photos) {
    const sourcePath = path.join(originalDir, photo.id);
    if (!fs.existsSync(sourcePath)) {
      console.log(`${photo.id}: skipping (no original on disk)`);
      skippedNoOriginal++;
      continue;
    }
    const targetPath = path.join(outputDir, photo.id);
    const fileExists = fs.existsSync(targetPath);
    if (fileExists && haveRow.has(photo.id) && !force) {
      skippedExisting++;
      continue;
    }
    if (apply) {
      await sharp(sourcePath)
        .rotate()
        .resize(profile.maxDim, profile.maxDim, {
          fit: "inside",
          withoutEnlargement: true,
        })
        .toFile(targetPath);
      await fs.promises.chmod(targetPath, 0o644);
      await db.upsertPhotoRendition(photo.id, name, profile.maxDim);
    }
    generated++;
  }

  console.log(
    `\n${generated} would-be-generated / ${skippedExisting} already present / ` +
      `${skippedNoOriginal} skipped (no original).`
  );
  if (!apply) {
    console.log("Dry run. Re-run with --apply to write files + rows.");
  }
};

await yargs(hideBin(process.argv))
  .scriptName("photo-rerender.ts")
  .locale("en")
  .strict()
  .usage(
    "Usage: $0 [scan]\n       $0 generate <name> [--force] [--apply]\n       $0 prune [--apply]"
  )
  .option("apply", {
    type: "boolean",
    default: false,
    describe:
      "Actually write DB rows / files. Default is dry-run (prints the plan).",
  })
  .command(
    ["scan", "$0"],
    "Walk photos/ and register any <name>/<id>.jpg the DB doesn't yet know about.",
    () => {},
    async (argv) => {
      await runScan(argv.apply);
    }
  )
  .command(
    "generate <name>",
    "Render missing <name>/<id>.jpg from original/<id>.jpg using the configured maxDim.",
    (y) =>
      y
        .positional("name", { type: "string", demandOption: true })
        .option("force", {
          type: "boolean",
          default: false,
          describe:
            "Overwrite existing <name>/<id>.jpg files even if a photo_rendition row already exists.",
        }),
    async (argv) => {
      await runGenerate(argv.name as string, argv.apply, argv.force);
    }
  )
  .command(
    "prune",
    "Drop photo_rendition rows whose file is no longer on disk.",
    () => {},
    async (argv) => {
      await runPrune(argv.apply);
    }
  )
  .demandCommand(0)
  .parseAsync();
