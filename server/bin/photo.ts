#!/usr/bin/env -S npx tsx
/* eslint-disable @typescript-eslint/no-explicit-any, no-console -- interactive CLI tool; console output is the UI */
import fs from "node:fs";
import path from "node:path";

import yargs from "yargs";
import { hideBin } from "yargs/helpers";

import logger from "../lib/logger.js";
import db from "../db/index.js";

const formatTable = (rows: string[][]): string => {
  if (rows.length <= 1) return rows[0]?.join("  ") ?? "";
  const widths = rows[0].map((_, col) =>
    Math.max(...rows.map((r) => r[col].length))
  );
  return rows
    .map((row, i) => {
      const padded = row.map((cell, c) => cell.padEnd(widths[c])).join("  ");
      return i === 0
        ? `${padded}\n${widths.map((w) => "-".repeat(w)).join("  ")}`
        : padded;
    })
    .join("\n");
};

const addToGalleries = async (photoId: string, galleries: unknown) => {
  if (!galleries) return;
  const list = typeof galleries === "string" ? [galleries] : (galleries as string[]);
  try {
    await db.unlinkAllGalleries(photoId);
    await db.linkGalleryPhoto(list, [photoId]);
    logger.info(`Photo "${photoId}" linked to galleries ${list.map((g) => `"${g}"`).join(", ")}`);
  } catch (error) {
    logger.error(`Linking "${photoId}" failed:`, error);
  }
};

// Find the existing row to update for a photo whose `id` in the input JSON
// may be the new stable id, the legacy filename-id, or just the original
// camera filename (e.g. IMG_1234.jpg) the operator's script knows it by.
// Chain:
//   1. exact `id` match — current behaviour, also catches legacy rows.
//   2. originalFilename match — finds renamed photos by their old name.
//   3. (originalFilename, taken.instant.timestamp) — disambiguates camera
//      counter rollovers / multi-camera duplicates.
//   4. no match → fall through to create (preserves the pre-#223 flow).
//   ambiguous → loud error; never silently merge unrelated photos.
type Lookup =
  | { kind: "update"; existingId: string }
  | { kind: "create" }
  | { kind: "ambiguous"; candidates: any[] };

const lookup = async (photo: any): Promise<Lookup> => {
  if (!photo.id) return { kind: "create" };

  // Step 1: exact id match. Direct hit; safest, no ambiguity.
  try {
    await db.loadPhoto(photo.id);
    return { kind: "update", existingId: photo.id };
  } catch {
    // fall through
  }

  // Step 2: originalFilename match — but ALWAYS narrowed by
  // taken.instant.timestamp. originalFilename alone isn't proof of
  // identity (camera counter rollovers, multi-camera setups produce
  // unrelated photos with the same name); silently picking "the
  // only candidate" is the bug we're avoiding.
  const candidates = (await db.loadPhotosByOriginalFilename(photo.id)) as any[];
  if (candidates.length === 0) return { kind: "create" };

  const wantTaken = photo.taken?.instant?.timestamp;
  if (wantTaken) {
    const matches = candidates.filter(
      (c) => c.taken?.instant?.timestamp === wantTaken
    );
    if (matches.length === 1) {
      return { kind: "update", existingId: matches[0].id };
    }
    // 0 or 2+ matches at this point → fall through to ambiguous.
  }
  return { kind: "ambiguous", candidates };
};

const reportAmbiguous = (photo: any, candidates: any[]) => {
  const wantTaken = photo.taken?.instant?.timestamp;
  console.error(
    `Cannot resolve "${photo.id}" unambiguously. Existing row(s) with that originalFilename:`
  );
  for (const c of candidates) {
    const taken = c.taken?.instant?.timestamp ?? "—";
    console.error(`  ${c.id}  taken=${taken}`);
  }
  if (!wantTaken) {
    console.error(
      "Add taken.instant.timestamp to the input JSON to confirm which row to update (or that this is a different photo)."
    );
  } else {
    console.error(
      `No row matched taken.instant.timestamp="${wantTaken}". If this is a different photo with a rolled-over filename, use the renamed id directly.`
    );
  }
};

const applyOverrides = (photo: any, argv: any) => {
  if ("title" in argv) photo.title = argv.title;
  if ("description" in argv) photo.description = argv.description;
  if ("author" in argv) {
    photo.taken = photo.taken || {};
    photo.taken.author = argv.author;
  }
  if ("country" in argv) {
    photo.taken = photo.taken || {};
    photo.taken.location = photo.taken.location || {};
    photo.taken.location.country = argv.country;
  }
  if ("place" in argv) {
    photo.taken = photo.taken || {};
    photo.taken.location = photo.taken.location || {};
    photo.taken.location.place = argv.place;
  }
  if ("camera-make" in argv) {
    photo.camera = photo.camera || {};
    photo.camera.make = argv["camera-make"];
  }
  if ("camera-model" in argv) {
    photo.camera = photo.camera || {};
    photo.camera.model = argv["camera-model"];
  }
  if ("lens-make" in argv) {
    photo.lens = photo.lens || {};
    photo.lens.make = argv["lens-make"];
  }
  if ("lens-model" in argv) {
    photo.lens = photo.lens || {};
    photo.lens.model = argv["lens-model"];
  }
  if ("focal" in argv) {
    photo.exposure = photo.exposure || {};
    photo.exposure.focalLength = argv.focal;
  }
  if ("aperture" in argv) {
    photo.exposure = photo.exposure || {};
    photo.exposure.aperture = argv.aperture;
  }
};

const processPhoto = async (photo: any, argv: any) => {
  if (!photo.id) {
    logger.error("Photo JSON has no id; skipping");
    return;
  }
  applyOverrides(photo, argv);

  const r = await lookup(photo);
  if (r.kind === "ambiguous") {
    reportAmbiguous(photo, r.candidates);
    process.exitCode = 1;
    return;
  }
  if (r.kind === "update") {
    const update = { ...photo };
    delete update.id;
    try {
      await db.updatePhoto(r.existingId, update);
      logger.info(`Updated "${r.existingId}"`);
      await addToGalleries(r.existingId, argv.gallery);
    } catch (error) {
      logger.error(`Update of "${r.existingId}" failed:`, error);
    }
    return;
  }
  // create — default originalFilename to the input id so the converter's
  // `loadPhotosByOriginalFilename` finds this row when the SOOC eventually
  // arrives (JSON-first stub flow). The operator's existing
  // `{ id, taken: { location: { coordinates }}}` JSONs keep working without
  // having to also send originalFilename explicitly.
  const create = { ...photo };
  if (!create.originalFilename) create.originalFilename = create.id;
  try {
    await db.createPhoto(create);
    logger.info(`Created "${create.id}"`);
    await addToGalleries(create.id, argv.gallery);
  } catch (error) {
    logger.error(`Creating "${create.id}" failed:`, error);
  }
};

const processJson = async (filePath: string, argv: any) => {
  try {
    const json = await fs.promises.readFile(filePath, { encoding: "utf-8" });
    const data = JSON.parse(json);
    if (Array.isArray(data)) {
      for (const photo of data) await processPhoto(photo, argv);
    } else if (!("id" in data)) {
      for (const photo of Object.values(data)) await processPhoto(photo, argv);
    } else {
      await processPhoto(data, argv);
    }
  } catch (error) {
    logger.error("Failed:", error);
  }
};

const processJpeg = async (filePath: string, argv: any) => {
  const fileName = path.basename(filePath);
  await processPhoto({ id: fileName }, argv);
};

await yargs(hideBin(process.argv))
  .scriptName("photo.ts")
  .locale("en")
  .strict()
  .command(
    "$0 <files..>",
    "Add or update photos from JSON / JPEG files",
    (y) =>
      y
        .positional("files", { describe: "JSON or JPEG paths", type: "string", array: true })
        .option("gallery", {
          describe: "Link the photo(s) to one or more galleries (repeat for multiple)",
          type: "array",
          string: true,
        })
        .group(["title", "description", "country"], "Properties")
        .option("title", { type: "string", describe: "Title" })
        .option("description", { type: "string", describe: "Description" })
        .option("country", {
          type: "string",
          describe: "Two-letter country code (ISO 3166-1 alpha-2)",
        })
        .group(
          [
            "author",
            "place",
            "camera-make",
            "camera-model",
            "lens-make",
            "lens-model",
            "focal",
            "aperture",
          ],
          "Overrides"
        )
        .option("author", { type: "string", describe: "Author" })
        .option("place", { type: "string", describe: "Free-form place description" })
        .option("camera-make", { type: "string", describe: "Camera make" })
        .option("camera-model", { type: "string", describe: "Camera model" })
        .option("lens-make", { type: "string", describe: "Lens make" })
        .option("lens-model", { type: "string", describe: "Lens model" })
        .option("focal", { type: "number", describe: "Focal length" })
        .option("aperture", { type: "number", describe: "Aperture value (f-number)" }),
    async (argv) => {
      for (const filePath of argv.files ?? []) {
        const fp = String(filePath);
        logger.debug(`Processing "${fp}"`);
        switch (path.extname(fp)) {
          case ".json":
            await processJson(fp, argv);
            break;
          case ".jpg":
            await processJpeg(fp, argv);
            break;
          default:
            logger.error(`Unrecognised extension: ${fp}`);
        }
      }
    }
  )
  .command(
    "search <originalFilename>",
    "List photos with a matching originalFilename (useful for collision triage)",
    (y) =>
      y.positional("originalFilename", {
        describe: "Original camera filename to search for (e.g. IMG_1234.jpg)",
        type: "string",
        demandOption: true,
      }),
    async (argv) => {
      const rows = (await db.loadPhotosByOriginalFilename(
        argv.originalFilename
      )) as any[];
      if (rows.length === 0) {
        console.log(`(no photos with originalFilename "${argv.originalFilename}")`);
        return;
      }
      const table: string[][] = [["id", "originalFilename", "taken"]];
      for (const r of rows) {
        table.push([
          r.id ?? "",
          r.originalFilename ?? "",
          r.taken?.instant?.timestamp ?? "",
        ]);
      }
      console.log(formatTable(table));
    }
  )
  .demandCommand(1, "Specify a subcommand or pass at least one file")
  .parseAsync();
