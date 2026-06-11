#!/usr/bin/env -S npx tsx
/* eslint-disable @typescript-eslint/no-explicit-any, no-console -- interactive CLI tool; console output is the UI */

/**
 * Manage gallery rows. Subcommands:
 *
 *   gallery.ts list
 *   gallery.ts create <id> [--title …] [--description …] …
 *   gallery.ts update <id> [--title …] [--description …] …
 *   gallery.ts delete <id>
 *   gallery.ts audit [--missing …] [--empty] [--orphan-photos] …
 *
 * Each subcommand is explicit — no default command, so a typo can't
 * silently create a gallery. `audit` finds data drift: galleries with
 * missing properties, galleries with no photos, and gallery_photo rows
 * whose referenced photo or gallery no longer exists.
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

const fieldOptions = (y: any) =>
  y
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
    .option("source", {
      describe:
        "Make this a virtual gallery whose contents are the union of these source gallery ids. Repeat for multiple. Pass --source '' on update to convert a virtual gallery back to a real one.",
      type: "string",
      array: true,
    });

// Parse `--source` flag values into a clean list. Yargs `array: true`
// with explicit empty string passed once → ['']: treat that as "clear
// the virtual mapping". Otherwise filter empties + trim.
const parseSources = (raw: string[] | undefined): string[] | undefined => {
  if (raw === undefined) return undefined;
  if (raw.length === 1 && raw[0] === "") return [];
  return raw.map((s) => s.trim()).filter((s) => s.length > 0);
};

await yargs(hideBin(process.argv))
  .scriptName("gallery.ts")
  .locale("en")
  .strict()
  .demandCommand(
    1,
    "Specify a subcommand: list, create, update, delete, access, or audit"
  )
  .command(
    "list",
    "Print every gallery as a table",
    (y) => y,
    async () => {
      const galleries = (await db.loadGalleries()) as Array<{
        id: string;
        title?: string;
        hostname?: string;
      }>;
      const rows: string[][] = [["id", "title", "hostname"]];
      for (const g of galleries) {
        rows.push([g.id, g.title ?? "", g.hostname ?? ""]);
      }
      console.log(rows.length === 1 ? "(no galleries)" : formatTable(rows));
    }
  )
  .command(
    "create <id>",
    "Create a new gallery (fails if id already exists)",
    (y) =>
      fieldOptions(
        y.positional("id", {
          describe: "Gallery ID (used in URLs and ACL references)",
          type: "string",
          demandOption: true,
        })
      ),
    async (argv) => {
      const galleryId = argv.id as string;
      const existing = await db
        .loadGallery(galleryId)
        .then((g) => g as { id: string })
        .catch(() => null);
      if (existing) {
        console.error(`✗ Gallery "${galleryId}" already exists. Use \`update\` to modify it.`);
        process.exit(1);
      }
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
      const sources = parseSources(argv.source as string[] | undefined);
      if (sources && sources.length > 0) {
        await db.upsertVirtualGallery(galleryId, sources);
        console.log(
          `✓ Created virtual gallery "${galleryId}" with sources: ${sources.join(", ")}.`
        );
      } else {
        console.log(`✓ Created gallery "${galleryId}".`);
      }
    }
  )
  .command(
    "update <id>",
    "Update an existing gallery (fails if id is missing)",
    (y) =>
      fieldOptions(
        y.positional("id", {
          describe: "Gallery ID",
          type: "string",
          demandOption: true,
        })
      ),
    async (argv) => {
      const galleryId = argv.id as string;
      const existing = await db
        .loadGallery(galleryId)
        .then((g) => g as { id: string })
        .catch(() => null);
      if (!existing) {
        console.error(`✗ Gallery "${galleryId}" doesn't exist. Use \`create\` first.`);
        process.exit(1);
      }
      const updates: Record<string, string> = {};
      if ("title" in argv) updates.title = argv.title as string;
      if ("description" in argv) updates.description = argv.description as string;
      if ("epoch" in argv) updates.epoch = argv.epoch as string;
      if ("epoch_type" in argv) updates.epoch_type = argv.epoch_type as string;
      if ("theme" in argv) updates.theme = argv.theme as string;
      if ("initial_view" in argv) updates.initial_view = argv.initial_view as string;
      if ("hostname" in argv) updates.hostname = argv.hostname as string;
      await db.updateGallery(galleryId, updates);
      const sources = parseSources(argv.source as string[] | undefined);
      if (sources !== undefined) {
        if (sources.length === 0) {
          await db.deleteVirtualGallery(galleryId);
          console.log(
            `✓ Updated gallery "${galleryId}" — converted to a real (non-virtual) gallery.`
          );
        } else {
          await db.upsertVirtualGallery(galleryId, sources);
          console.log(
            `✓ Updated gallery "${galleryId}" with sources: ${sources.join(", ")}.`
          );
        }
      } else {
        console.log(`✓ Updated gallery "${galleryId}".`);
      }
    }
  )
  .command(
    "delete <id>",
    "Delete a gallery (cascades gallery_photo and user_gallery rows)",
    (y) =>
      y.positional("id", {
        describe: "Gallery ID",
        type: "string",
        demandOption: true,
      }),
    async (argv) => {
      const galleryId = argv.id as string;
      const existing = await db
        .loadGallery(galleryId)
        .then((g) => g as { id: string })
        .catch(() => null);
      if (!existing) {
        console.error(`✗ Gallery "${galleryId}" doesn't exist.`);
        process.exit(1);
      }
      await db.deleteGallery(galleryId);
      console.log(`✓ Deleted gallery "${galleryId}".`);
    }
  )
  .command(
    "access [gallery]",
    "Print who has access to a gallery (user_gallery + group_gallery rows). Omit <gallery> to dump every gallery's access table.",
    (y) =>
      y.positional("gallery", {
        describe: "Gallery ID (omit to scan every gallery)",
        type: "string",
      }),
    async (argv) => {
      const targets = argv.gallery
        ? [argv.gallery]
        : (
          (await db.loadGalleries()) as Array<{ id: string }>
        ).map((g) => g.id);
      let printed = false;
      for (const galleryId of targets) {
        const users = (await db.loadUserGalleryRows({ galleryId })) as Array<{
          user_id: string;
          gallery_id: string;
          is_editor: number;
          hide_map: number | null;
        }>;
        const groups = (await db.loadGroupGalleryRows({ galleryId })) as Array<{
          group_id: string;
          gallery_id: string;
          is_editor: number;
          hide_map: number | null;
        }>;
        if (users.length === 0 && groups.length === 0) continue;
        if (printed) console.log();
        printed = true;
        console.log(`gallery: ${galleryId}`);
        const lines: string[][] = [["type", "id", "access", "hide_map"]];
        for (const r of users) {
          lines.push([
            "user",
            r.user_id,
            r.is_editor ? "editor" : "view",
            r.hide_map === null ? "—" : r.hide_map === 1 ? "hide" : "show",
          ]);
        }
        for (const r of groups) {
          lines.push([
            "group",
            r.group_id,
            r.is_editor ? "editor" : "view",
            r.hide_map === null ? "—" : r.hide_map === 1 ? "hide" : "show",
          ]);
        }
        console.log(formatTable(lines));
      }
      if (!printed) console.log("(no access rows)");
    }
  )
  .command(
    "audit",
    "Find galleries with missing properties, empty galleries, or orphan gallery_photo / user_gallery / group_gallery rows",
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
        .option("orphan-access", {
          type: "boolean",
          default: false,
          describe:
            "Restrict to user_gallery / group_gallery rows whose gallery is gone",
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
        argv["orphan-galleries"] ||
        argv["orphan-access"];

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

      if (want("orphan-access")) {
        const galleryIds = new Set<string>(galleries.map((g: any) => g.id));
        const orphanUserRows = (await db.loadUserGalleryRows({})).filter(
          (r) => !galleryIds.has(r.gallery_id)
        );
        const orphanGroupRows = (await db.loadGroupGalleryRows({})).filter(
          (r) => !galleryIds.has(r.gallery_id)
        );
        const rows: string[][] = [["type", "id", "gallery_id"]];
        for (const r of orphanUserRows) rows.push(["user", r.user_id, r.gallery_id]);
        for (const r of orphanGroupRows) rows.push(["group", r.group_id, r.gallery_id]);
        printList(
          "user_gallery / group_gallery rows referencing a missing gallery",
          rows
        );
      }
    }
  )
  .command(
    "filter",
    "Manage a gallery's saved filters (sub-galleries on a single source)",
    (y) =>
      y
        .demandCommand(1, "Specify a sub-subcommand: list, add, remove, update")
        .command(
          "list <gallery>",
          "Print every saved filter on a gallery as a table",
          (y2) =>
            y2.positional("gallery", {
              describe: "Gallery id",
              type: "string",
              demandOption: true,
            }),
          async (argv) => {
            const galleryId = argv.gallery as string;
            const filters = (await db.loadSavedFilters(galleryId)) as Array<{
              id: string;
              title: string;
              ordinal: number;
              definition: Record<string, unknown>;
            }>;
            if (filters.length === 0) {
              console.log("(no saved filters)");
              return;
            }
            const rows: string[][] = [["id", "title", "ordinal", "definition"]];
            for (const f of filters) {
              rows.push([
                f.id,
                f.title,
                String(f.ordinal),
                JSON.stringify(f.definition),
              ]);
            }
            console.log(formatTable(rows));
          }
        )
        .command(
          "add <gallery> <id>",
          "Create a saved filter on a gallery (definition is a JSON string)",
          (y2) =>
            y2
              .positional("gallery", {
                describe: "Gallery id",
                type: "string",
                demandOption: true,
              })
              .positional("id", {
                describe: "Saved-filter id (slug shape)",
                type: "string",
                demandOption: true,
              })
              .option("title", {
                describe: "Display title (optional)",
                type: "string",
              })
              .option("definition", {
                describe:
                  "JSON string for the filter envelope: `{filter?, dateRange?}`",
                type: "string",
                demandOption: true,
              })
              .option("ordinal", {
                describe: "Display order index (default 0)",
                type: "number",
              }),
          async (argv) => {
            const galleryId = argv.gallery as string;
            const filterId = argv.id as string;
            let definition: Record<string, unknown>;
            try {
              definition = JSON.parse(argv.definition as string) as Record<
                string,
                unknown
              >;
            } catch (err) {
              console.error(
                `✗ --definition is not valid JSON: ${(err as Error).message}`
              );
              process.exit(1);
            }
            await db.createSavedFilter({
              id: filterId,
              galleryId,
              title: (argv.title as string | undefined) ?? "",
              definition,
              ordinal: (argv.ordinal as number | undefined) ?? 0,
            });
            console.log(
              `✓ Created saved filter "${filterId}" on gallery "${galleryId}".`
            );
          }
        )
        .command(
          "remove <gallery> <id>",
          "Delete a saved filter from a gallery",
          (y2) =>
            y2
              .positional("gallery", {
                describe: "Gallery id",
                type: "string",
                demandOption: true,
              })
              .positional("id", {
                describe: "Saved-filter id",
                type: "string",
                demandOption: true,
              }),
          async (argv) => {
            const galleryId = argv.gallery as string;
            const filterId = argv.id as string;
            await db.deleteSavedFilter(galleryId, filterId);
            console.log(
              `✓ Deleted saved filter "${filterId}" from gallery "${galleryId}".`
            );
          }
        )
        .command(
          "update <gallery> <id>",
          "Update an existing saved filter (any of --title / --definition / --ordinal)",
          (y2) =>
            y2
              .positional("gallery", {
                describe: "Gallery id",
                type: "string",
                demandOption: true,
              })
              .positional("id", {
                describe: "Saved-filter id",
                type: "string",
                demandOption: true,
              })
              .option("title", { type: "string" })
              .option("definition", {
                describe: "JSON string replacing the filter envelope",
                type: "string",
              })
              .option("ordinal", { type: "number" }),
          async (argv) => {
            const galleryId = argv.gallery as string;
            const filterId = argv.id as string;
            const patch: {
              title?: string;
              definition?: Record<string, unknown>;
              ordinal?: number;
            } = {};
            if ("title" in argv) patch.title = argv.title as string;
            if ("ordinal" in argv) patch.ordinal = argv.ordinal as number;
            if ("definition" in argv && argv.definition !== undefined) {
              try {
                patch.definition = JSON.parse(
                  argv.definition as string
                ) as Record<string, unknown>;
              } catch (err) {
                console.error(
                  `✗ --definition is not valid JSON: ${(err as Error).message}`
                );
                process.exit(1);
              }
            }
            await db.updateSavedFilter(galleryId, filterId, patch);
            console.log(
              `✓ Updated saved filter "${filterId}" on gallery "${galleryId}".`
            );
          }
        )
  )
  .demandCommand(1)
  .parseAsync();
