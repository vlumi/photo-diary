#!/usr/bin/env -S npx tsx
/* eslint-disable no-console -- interactive CLI tool; console output is the UI */

/**
 * Upsert a gallery row. The gallery ID is required (positional); every other
 * field is an optional override. Re-invoking with the same ID and different
 * flags partially updates — only the fields you passed are touched.
 *
 *   gallery.ts <id> [--title …] [--description …] [--epoch …] …
 */

import yargs from "yargs";
import { hideBin } from "yargs/helpers";

import db from "../db/index.js";

const argv = yargs(hideBin(process.argv))
  .scriptName("gallery.ts")
  .usage("Usage: $0 <id> [options]")
  .strict()
  .command("$0 <id>", "Create or update a gallery", (y) =>
    y
      .positional("id", {
        describe: "Gallery ID (used in URLs and ACL references)",
        type: "string",
        demandOption: true,
      })
      .option("title", { describe: "Display title", type: "string" })
      .option("description", { describe: "Long description", type: "string" })
      .option("epoch", { describe: "Anchor date (YYYY-MM-DD)", type: "string" })
      .option("epoch_type", { describe: "Epoch type — see models/GalleryModel.ts", type: "string" })
      .option("theme", { describe: "Theme name", type: "string" })
      .option("initial_view", {
        describe: "Initial view: year, month, day, or photo",
        type: "string",
      })
      .option("hostname", {
        describe: "Regex for hostnames that default to this gallery",
        type: "string",
      })
  )
  .parseSync();

const galleryId = argv.id as string;

const existing = await db
  .loadGallery(galleryId)
  .then((g) => g as { id: string })
  .catch(() => null);

if (existing) {
  const updates: Record<string, string> = {};
  if ("title" in argv) updates.title = argv.title as string;
  if ("description" in argv) updates.description = argv.description as string;
  if ("epoch" in argv) updates.epoch = argv.epoch as string;
  if ("epoch_type" in argv) updates.epoch_type = argv.epoch_type as string;
  if ("theme" in argv) updates.theme = argv.theme as string;
  if ("initial_view" in argv) updates.initial_view = argv.initial_view as string;
  await db.updateGallery(existing.id, updates);
  console.log(`✓ Updated gallery "${galleryId}".`);
} else {
  await db.createGallery({
    id: galleryId,
    title: argv.title as string | undefined,
    description: argv.description as string | undefined,
    epoch: argv.epoch as string | undefined,
    epochType: argv.epoch_type as string | undefined,
    theme: argv.theme as string | undefined,
    initialView: argv.initial_view as string | undefined,
  });
  console.log(`✓ Created gallery "${galleryId}".`);
}
