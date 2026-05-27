#!/usr/bin/env -S npx tsx
/* eslint-disable @typescript-eslint/no-explicit-any, no-console -- interactive CLI tool; console output is the UI */

/**
 * Manage gallery rows.
 *
 *   gallery.ts <id> [--title …] [--description …] [--epoch …] …
 *   gallery.ts audit [--missing …] [--empty] [--orphan-photos] [--orphan-galleries] [--format table|ids]
 *
 * The default command upserts a gallery (create on first call, partial
 * update on subsequent calls). The `audit` subcommand finds data drift —
 * galleries with missing properties, galleries with no photos, and
 * gallery_photo rows whose referenced photo or gallery no longer exists
 * (the latter directly catches the dailybw-style FK violation the
 * migrate post-check would otherwise surface only after attempting an
 * upgrade).
 */

import yargs from "yargs";
import { hideBin } from "yargs/helpers";

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

const isMissing = (v: unknown): boolean =>
  v === null || v === undefined || v === "";

await yargs(hideBin(process.argv))
  .scriptName("gallery.ts")
  .locale("en")
  .usage("Usage: $0 <id> [options] | $0 audit [...]")
  .strict()
  .command(
    "$0 <id>",
    "Create or update a gallery",
    (y) =>
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
        }),
    async (argv) => {
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
        if ("hostname" in argv) updates.hostname = argv.hostname as string;
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
          hostname: argv.hostname as string | undefined,
        });
        console.log(`✓ Created gallery "${galleryId}".`);
      }
    }
  )
  .command(
    "audit",
    "Find galleries with missing properties, empty galleries, or orphan gallery_photo rows",
    (y) =>
      y
        .option("missing", {
          describe:
            "Restrict to a single missing-field check (default: every check)",
          choices: ["title", "description", "icon", "epoch"] as const,
        })
        .option("empty", {
          type: "boolean",
          default: false,
          describe: "Restrict to galleries with no photos linked",
        })
        .option("orphan-photos", {
          type: "boolean",
          default: false,
          describe:
            "Restrict to gallery_photo rows whose referenced photo no longer exists",
        })
        .option("orphan-galleries", {
          type: "boolean",
          default: false,
          describe:
            "Restrict to gallery_photo rows whose referenced gallery no longer exists",
        })
        .option("format", {
          choices: ["table", "ids"] as const,
          default: "table" as const,
          describe:
            "table (default, with id/title etc.) or ids (one id per line)",
        }),
    async (argv) => {
      const galleries = (await db.loadGalleries()) as any[];
      const emptyIds = new Set<string>(await db.loadEmptyGalleryIds());
      const orphanLinks = await db.loadOrphanGalleryPhotoLinks();

      const filterFlag =
        argv.missing !== undefined ||
        argv.empty ||
        argv["orphan-photos"] ||
        argv["orphan-galleries"];

      const want = (key: string) => !filterFlag || argv[key];
      const wantMissing = (field: string) =>
        !filterFlag || argv.missing === field;

      const printList = (title: string, rows: string[][]): void => {
        if (argv.format === "ids") {
          for (const r of rows.slice(1)) console.log(r[0]);
          return;
        }
        console.log(`\n${title}: ${rows.length - 1}`);
        if (rows.length > 1) console.log(formatTable(rows));
      };

      if (argv.format === "table") {
        console.log(`Audited ${galleries.length} gallery row(s).`);
      }

      for (const field of ["title", "description", "icon", "epoch"]) {
        if (!wantMissing(field)) continue;
        const probe = (g: any) => isMissing(g[field]);
        const rows: string[][] = [["id", field]];
        for (const g of galleries.filter(probe)) {
          rows.push([g.id, g[field] ?? ""]);
        }
        printList(`Galleries with missing ${field}`, rows);
      }

      if (want("empty")) {
        const rows: string[][] = [["id", "title"]];
        for (const g of galleries.filter((g: any) => emptyIds.has(g.id))) {
          rows.push([g.id, g.title ?? ""]);
        }
        printList("Galleries with no photos linked", rows);
      }

      if (want("orphan-photos")) {
        const rows: string[][] = [["gallery_id", "photo_id"]];
        for (const link of orphanLinks.filter((l) => l.missing === "photo")) {
          rows.push([link.galleryId, link.photoId]);
        }
        printList(
          "gallery_photo rows referencing a missing photo",
          rows
        );
      }

      if (want("orphan-galleries")) {
        const rows: string[][] = [["gallery_id", "photo_id"]];
        for (const link of orphanLinks.filter((l) => l.missing === "gallery")) {
          rows.push([link.galleryId, link.photoId]);
        }
        printList(
          "gallery_photo rows referencing a missing gallery",
          rows
        );
      }
    }
  )
  .demandCommand(1)
  .parseAsync();
