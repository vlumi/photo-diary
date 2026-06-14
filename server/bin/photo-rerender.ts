#!/usr/bin/env -S npx tsx
/* eslint-disable no-console -- interactive CLI tool; console output is the UI */

/**
 * Operator script for the `photo_rendition` table.
 *
 *   photo-rerender.ts                    # scan: register on-disk files
 *   photo-rerender.ts generate <maxDim>  # render missing display/<maxDim>/<id>.jpg
 *                                          from original/<id>.jpg
 *   photo-rerender.ts prune              # drop rows whose file is gone
 *
 * Runs from the per-instance directory (`/var/photo-diary/<name>/`),
 * so `photos/` is at `./photos/` and the DB is at `./db.sqlite3`.
 *
 * All modes default to dry-run; pass `--apply` to write. `generate`
 * additionally takes `--force` to overwrite an existing
 * `display/<maxDim>/<id>.jpg`.
 *
 * `generate` reads from `original/<id>.jpg`. Originals are often
 * kept off-server; missing originals are skipped with a one-liner
 * per photo, and the run continues. If you have larger renders
 * only on your local machine, run sharp locally and rsync the
 * directory up, then run `photo-rerender.ts` (scan) to register
 * the rows.
 */

import fs from "node:fs";
import path from "node:path";

import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import sharp from "sharp";

import db from "../db/index.js";
import {
  DIR_DISPLAY,
  DIR_ORIGINAL,
} from "photo-diary-converter/lib/constants.js";
import { loadRenditions } from "photo-diary-converter/lib/renditions.js";

const DIR_PHOTOS = "photos";

const photoRoot = path.join(process.cwd(), DIR_PHOTOS);
if (!fs.existsSync(photoRoot)) {
  console.error(
    `No "photos/" directory at ${photoRoot}. Run this from an instance directory.`
  );
  process.exit(1);
}

const displayRoot = path.join(photoRoot, DIR_DISPLAY);
const originalDir = path.join(photoRoot, DIR_ORIGINAL);

const listJpegs = (dir: string): string[] => {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => /\.jpe?g$/i.test(f))
    .sort();
};

const listDimSubdirs = (): number[] => {
  if (!fs.existsSync(displayRoot)) return [];
  return fs
    .readdirSync(displayRoot, { withFileTypes: true })
    .filter((e) => e.isDirectory() && /^\d+$/.test(e.name))
    .map((e) => Number(e.name))
    .sort((a, b) => a - b);
};

const runScan = async (apply: boolean): Promise<void> => {
  const dims = listDimSubdirs();
  if (dims.length === 0) {
    console.log(
      `No display/<maxDim>/ subdirectories under ${displayRoot}. Nothing to scan.`
    );
    return;
  }

  const photos = (await db.loadPhotos()) as Array<{ id: string }>;
  const knownIds = new Set(photos.map((p) => p.id));
  const existingRows = await db.loadAllPhotoRenditions();
  const haveRow = new Set(
    existingRows.map((r) => `${r.photoId}|${r.maxDim}`)
  );

  for (const dim of dims) {
    const dir = path.join(displayRoot, String(dim));
    const files = listJpegs(dir);
    let inserted = 0;
    let alreadyExists = 0;
    let unknownPhoto = 0;
    for (const file of files) {
      const id = file;
      if (!knownIds.has(id)) {
        console.log(`[display/${dim}] unknown photo: ${id}`);
        unknownPhoto++;
        continue;
      }
      if (haveRow.has(`${id}|${dim}`)) {
        alreadyExists++;
        continue;
      }
      if (apply) {
        await db.upsertPhotoRendition(id, dim);
      }
      inserted++;
    }
    console.log(
      `[display/${dim}] ${files.length} files, ` +
        `${inserted} would-be-inserted / ${alreadyExists} present / ${unknownPhoto} unknown`
    );
  }

  if (!apply) {
    console.log("\nDry run. Re-run with --apply to write rows.");
  }
};

const runPrune = async (apply: boolean): Promise<void> => {
  const rows = await db.loadAllPhotoRenditions();
  const dangling = rows.filter(
    (r) =>
      !fs.existsSync(
        path.join(displayRoot, String(r.maxDim), r.photoId)
      )
  );
  if (dangling.length === 0) {
    console.log("No dangling photo_rendition rows.");
    return;
  }
  for (const r of dangling) {
    console.log(`display/${r.maxDim}/${r.photoId} (file missing)`);
  }
  console.log(
    `\n${dangling.length} row(s) ${apply ? "deleted" : "would be deleted (dry-run, pass --apply to write)"}.`
  );
  if (apply) {
    for (const r of dangling) {
      await db.deletePhotoRendition(r.photoId, r.maxDim);
    }
  }
};

const runGenerate = async (
  maxDim: number,
  apply: boolean,
  force: boolean
): Promise<void> => {
  const renditions = await loadRenditions();
  if (!renditions.includes(maxDim)) {
    console.error(
      `maxDim ${maxDim} is not in the renditions meta. Add it to /m/instance ` +
        "(or run \"./bin/meta.ts set instance_renditions ...\") before generating."
    );
    process.exit(1);
  }

  const outputDir = path.join(displayRoot, String(maxDim));

  const photos = (await db.loadPhotos()) as Array<{ id: string }>;
  const existingRows = (await db.loadAllPhotoRenditions()).filter(
    (r) => r.maxDim === maxDim
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
        .resize(maxDim, maxDim, {
          fit: "inside",
          withoutEnlargement: true,
        })
        .toFile(targetPath);
      await fs.promises.chmod(targetPath, 0o644);
      await db.upsertPhotoRendition(photo.id, maxDim);
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
    "Usage: $0 [scan]\n       $0 generate <maxDim> [--force] [--apply]\n       $0 prune [--apply]"
  )
  .option("apply", {
    type: "boolean",
    default: false,
    describe:
      "Actually write DB rows / files. Default is dry-run (prints the plan).",
  })
  .command(
    ["scan", "$0"],
    "Walk photos/display/<maxDim>/ subdirs and register any .jpg the DB doesn't yet know about.",
    () => {},
    async (argv) => {
      await runScan(argv.apply);
    }
  )
  .command(
    "generate <maxDim>",
    "Render missing display/<maxDim>/<id>.jpg from original/<id>.jpg.",
    (y) =>
      y
        .positional("maxDim", { type: "number", demandOption: true })
        .option("force", {
          type: "boolean",
          default: false,
          describe:
            "Overwrite existing display/<maxDim>/<id>.jpg files even if a photo_rendition row already exists.",
        }),
    async (argv) => {
      await runGenerate(argv.maxDim as number, argv.apply, argv.force);
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
