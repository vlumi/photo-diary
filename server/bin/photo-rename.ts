#!/usr/bin/env -S npx tsx
/* eslint-disable @typescript-eslint/no-explicit-any, no-console -- interactive CLI tool; console output is the UI */

/**
 * Rename every photo id (and its on-disk files) to the
 * <YYYY-MM-DDTHH-MM-SS>-<16-hex>.<ext> scheme the converter
 * produces for fresh imports.
 *
 *   photo-rename.ts                # default: --migrate, dry-run report
 *   photo-rename.ts --migrate      # only rows whose id isn't on the new scheme
 *   photo-rename.ts --scramble     # re-roll the UUID portion of EVERY row's id
 *                                    (URL-leak mitigation; old permalinks 404)
 *
 *   --apply       actually rename rows + files (default is dry-run report)
 *   --yes         skip the confirmation prompt
 *
 * Runs from the per-instance directory (`/var/photo-diary/<name>/`),
 * so `photos/` is at `./photos/` and the DB is at `./db.sqlite3`.
 *
 * Stop the server before running. The script doesn't try to detect
 * pm2 — toggling DB writes against a running server can leave the
 * gallery_photo FK pointing at a half-renamed row. The confirmation
 * prompt nudges; --yes bypasses (use with care).
 *
 * Files renamed per photo:
 *   display/<maxDim>/<id>.jpg    (one per configured rendition size)
 *   thumbnail/<id>.jpg
 *   original/<id>.jpg            (may have been cleaned up to save disk)
 *
 * Sidecars (`inbox/<id>.jpg.json`) are intentionally left alone — they're
 * an audit-trail artefact post-import, the system never looks at them by
 * filename, and the operator may have other sidecars in inbox/ under
 * custom names that this script has no business touching.
 *
 * Missing files are skipped (no error). DB updates run after the file
 * moves; if the DB update fails, the file moves are rolled back.
 */

import path from "node:path";
import fs from "node:fs";
import { randomUUID } from "node:crypto";
import { createInterface } from "node:readline/promises";

import yargs from "yargs";
import { hideBin } from "yargs/helpers";

import db from "../db/index.js";

const DIR_PHOTOS = "photos";
const DIR_DISPLAY = "display";
const DIR_THUMBNAIL = "thumbnail";
const DIR_ORIGINAL = "original";

// `display/<maxDim>/` enumerated from disk so new sizes pick up
// without a code edit.
const buildRenameableSubdirs = (photoRoot: string): string[] => {
  const out = [DIR_THUMBNAIL, DIR_ORIGINAL];
  const displayPath = path.join(photoRoot, DIR_DISPLAY);
  if (fs.existsSync(displayPath)) {
    for (const entry of fs.readdirSync(displayPath, { withFileTypes: true })) {
      if (entry.isDirectory() && /^\d+$/.test(entry.name)) {
        out.push(path.join(DIR_DISPLAY, entry.name));
      }
    }
  }
  return out;
};

// Matches the converter's scheme: <YYYY-MM-DDTHH-MM-SS>-<16-hex>.<ext>
const NEW_ID_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-[0-9a-f]{16}\.[a-z0-9]+$/i;

const formatIdTimestamp = (taken: string): string =>
  // taken is "YYYY-MM-DD HH:MM:SS"; new id uses "T" + dashes (URL-safe, Windows-safe).
  taken.replace(" ", "T").replace(/:/g, "-");

const generateId = (taken: string, ext: string): string => {
  const ts = formatIdTimestamp(taken);
  const uuid = randomUUID().replace(/-/g, "").slice(0, 16);
  return `${ts}-${uuid}${ext}`;
};

const fileExists = (p: string): boolean => {
  try {
    fs.statSync(p);
    return true;
  } catch {
    return false;
  }
};

const confirm = async (prompt: string): Promise<boolean> => {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    const answer = await rl.question(`${prompt} [y/N] `);
    return /^y(es)?$/i.test(answer.trim());
  } finally {
    rl.close();
  }
};

const argv = await yargs(hideBin(process.argv))
  .scriptName("photo-rename.ts")
  .locale("en")
  .strict()
  .usage("Usage: $0 [--scramble] [--apply] [--yes]")
  .option("scramble", {
    type: "boolean",
    default: false,
    describe:
      "Re-roll the UUID portion of EVERY row's id (URL-leak mitigation). Default mode is --migrate (idempotent; only rows not yet on the new scheme).",
  })
  .option("apply", {
    type: "boolean",
    default: false,
    describe:
      "Actually rename DB rows + on-disk files. Without this, the script prints the planned renames and exits (dry-run is the default).",
  })
  .option("yes", {
    type: "boolean",
    default: false,
    describe: "Skip the confirmation prompt (only meaningful with --apply).",
  })
  .parseAsync();

const mode: "migrate" | "scramble" = argv.scramble ? "scramble" : "migrate";
const apply = argv.apply;

const rootDir = process.cwd();
const photoRoot = path.join(rootDir, DIR_PHOTOS);
if (!fs.existsSync(photoRoot)) {
  console.error(
    `No "photos/" directory at ${photoRoot}. Run this from an instance directory.`
  );
  process.exit(1);
}

// ---- plan ----------------------------------------------------------------

type Plan =
  | { row: any; newId: string; ext: string }
  | { row: any; skip: string };

const photos = (await db.loadPhotos()) as any[];
const plan: Plan[] = [];
let alreadyMigrated = 0;

for (const row of photos) {
  const id: string = row.id;
  const isOnNewScheme = NEW_ID_PATTERN.test(id);
  if (mode === "migrate" && isOnNewScheme) {
    alreadyMigrated += 1;
    continue;
  }
  const taken = row.taken?.instant?.timestamp as string | undefined;
  if (!taken || taken === "Invalid date") {
    plan.push({ row, skip: "no valid taken timestamp" });
    continue;
  }
  const ext = path.extname(id) || ".jpg";
  plan.push({ row, newId: generateId(taken, ext), ext });
}

const ready = plan.filter((p): p is Extract<Plan, { newId: string }> => "newId" in p);
const skipped = plan.filter((p): p is Extract<Plan, { skip: string }> => "skip" in p);

console.log(`Mode: ${mode}${apply ? "" : " (dry-run)"}`);
console.log(`Photos in DB: ${photos.length}`);
console.log(`Rows to rename: ${ready.length}`);
if (alreadyMigrated > 0) {
  console.log(`Rows already on new scheme: ${alreadyMigrated} (skipped)`);
}
if (skipped.length > 0) {
  console.log(`Rows skipped (need manual fix): ${skipped.length}`);
  for (const item of skipped) {
    console.log(`  ${item.row.id}  (${item.skip})`);
  }
}

if (ready.length === 0) {
  console.log("\nNothing to do.");
  process.exit(0);
}

console.log("\nPlanned renames:");
const previewLimit = 10;
for (const item of ready.slice(0, previewLimit)) {
  console.log(`  ${item.row.id} → ${item.newId}`);
}
if (ready.length > previewLimit) {
  console.log(`  ... and ${ready.length - previewLimit} more`);
}

if (!apply) {
  console.log("\nDry run. Re-run with --apply to execute.");
  process.exit(0);
}

if (!argv.yes) {
  console.log("");
  const ok = await confirm(
    `Apply ${ready.length} renames? (the server should be stopped)`
  );
  if (!ok) {
    console.log("Aborted.");
    process.exit(0);
  }
}

// ---- execute -------------------------------------------------------------

const moved: Array<{ from: string; to: string }> = [];
const undoMoves = () => {
  for (const { from, to } of moved.reverse()) {
    try {
      fs.renameSync(to, from);
    } catch {
      // best-effort
    }
  }
};

try {
  // Phase 1: rename files on disk first. If the DB step fails we can roll
  // these back; if we updated the DB first and then a file rename failed,
  // the row would point at a non-existent file with no easy way to
  // recover the old name.
  const renameableSubdirs = buildRenameableSubdirs(photoRoot);
  for (const item of ready) {
    const oldId = item.row.id as string;
    const newId = item.newId;
    for (const subdir of renameableSubdirs) {
      const from = path.join(photoRoot, subdir, oldId);
      const to = path.join(photoRoot, subdir, newId);
      if (fileExists(from)) {
        fs.renameSync(from, to);
        moved.push({ from, to });
      }
    }
  }

  // Phase 2: DB updates. Each call wraps a transaction that retargets
  // photo.id and gallery_photo.photo_id atomically (FK enforcement is
  // toggled off for the rewrite — the FK is RESTRICT without ON UPDATE
  // CASCADE so we'd otherwise be blocked).
  for (const item of ready) {
    await db.renamePhoto(item.row.id, item.newId);
  }

  console.log(`\n✓ Renamed ${ready.length} rows and ${moved.length} files.`);
} catch (error) {
  console.error("\n✗ Error during execution, rolling back file moves:", error);
  undoMoves();
  console.error(
    "Files restored. Re-run (without --apply) to inspect state before retrying."
  );
  process.exit(1);
}
