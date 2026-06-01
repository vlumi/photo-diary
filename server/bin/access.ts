#!/usr/bin/env -S npx tsx
/* eslint-disable no-console -- interactive CLI tool; console output is the UI */

/**
 * Manage `user_gallery` rows — per-gallery access grants (grant /
 * revoke) and the privacy cascade's `hide_map` toggle (hide-map).
 *
 * Subcommands:
 *
 *   access.ts list [--user <id>] [--gallery <id>]
 *   access.ts grant <user> <gallery> [--admin]
 *   access.ts revoke <user> <gallery> [--yes]
 *   access.ts hide-map <user> <gallery> <hide|show|default>
 *   access.ts audit [...]
 *
 * `:guest` is accepted as the user. Pseudo-galleries (`:all`,
 * `:public`) are rejected — the model has no use for them. Global
 * admin is set via `bin/user.ts make-admin <user>`.
 */

import { createInterface } from "node:readline/promises";

import yargs from "yargs";
import { hideBin } from "yargs/helpers";

import CONST from "../lib/constants.js";
import db from "../db/index.js";
import type { UserGalleryRow } from "../db/index.js";

const REJECTED_GALLERIES = new Set([
  CONST.SPECIAL_GALLERY_ALL,
  CONST.SPECIAL_GALLERY_PUBLIC,
]);

const checkGalleryId = (galleryId: string) => {
  if (REJECTED_GALLERIES.has(galleryId)) {
    console.error(
      `✗ ${galleryId} is not a real gallery. ` +
        "For global admin, use `bin/user.ts make-admin <user>`."
    );
    process.exit(1);
  }
};

const accessLabel = (isAdmin: number): string =>
  isAdmin ? "admin" : "view";
const hideMapLabel = (value: number | null): string => {
  if (value === null) return "—";
  return value === 1 ? "hide" : "show";
};

const formatRows = (
  rows: UserGalleryRow[],
  globalAdmins: Set<string>
): string => {
  const annotatedGlobals = [...globalAdmins].sort().map(
    (id) => `${id}\t(global admin)`
  );
  if (rows.length === 0 && annotatedGlobals.length === 0) return "(no rows)";
  const header = ["user", "gallery", "access", "hide_map"];
  const lines: string[][] = [header];
  for (const r of rows) {
    const annotated = globalAdmins.has(r.user_id)
      ? `${r.user_id} (global admin)`
      : r.user_id;
    lines.push([annotated, r.gallery_id, accessLabel(r.is_admin), hideMapLabel(r.hide_map)]);
  }
  // Surface global admins with no per-gallery rows on their own line.
  for (const id of globalAdmins) {
    if (rows.some((r) => r.user_id === id)) continue;
    lines.push([`${id} (global admin)`, "—", "—", "—"]);
  }
  const widths = header.map((_, col) => Math.max(...lines.map((l) => l[col].length)));
  return lines
    .map((row, i) => {
      const padded = row.map((cell, c) => cell.padEnd(widths[c])).join("  ");
      return i === 0 ? `${padded}\n${widths.map((w) => "-".repeat(w)).join("  ")}` : padded;
    })
    .join("\n");
};

const loadGlobalAdmins = async (filter?: string): Promise<Set<string>> => {
  const users = (await db.loadUsers()) as Array<{ id: string; is_admin?: number | boolean }>;
  return new Set(
    users
      .filter((u) => !!u.is_admin)
      .map((u) => u.id)
      .filter((id) => !filter || id === filter)
  );
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

await yargs(hideBin(process.argv))
  .scriptName("access.ts")
  .locale("en")
  .strict()
  .demandCommand(1, "Specify a subcommand: list, grant, revoke, hide-map, or audit")
  .command(
    "list",
    "Print existing user_gallery rows (optionally filtered) plus global admins",
    (y) =>
      y
        .option("user", { describe: "Filter to one user ID (e.g. :guest)", type: "string" })
        .option("gallery", { describe: "Filter to one gallery ID", type: "string" }),
    async (argv) => {
      const rows = await db.loadUserGalleryRows({
        userId: argv.user,
        galleryId: argv.gallery,
      });
      // When filtering by gallery alone, the global-admin list isn't
      // gallery-scoped — only surface it when the gallery filter isn't set.
      const globals = argv.gallery
        ? new Set<string>()
        : await loadGlobalAdmins(argv.user);
      console.log(formatRows(rows, globals));
    }
  )
  .command(
    "grant <principal> <gallery>",
    "Grant view (or admin with --admin) on a gallery. Principal is a user id by default; pass --group to target a group instead. Idempotent — re-running with a different --admin toggles it.",
    (y) =>
      y
        .positional("principal", {
          describe: "User ID (or :guest), or group ID with --group",
          type: "string",
          demandOption: true,
        })
        .positional("gallery", { describe: "Gallery ID", type: "string", demandOption: true })
        .option("admin", { describe: "Grant gallery-admin instead of view", type: "boolean", default: false })
        .option("group", { describe: "Treat <principal> as a group ID", type: "boolean", default: false }),
    async (argv) => {
      checkGalleryId(argv.gallery);
      const target = argv.group ? "group" : "user";
      if (argv.group) {
        await db.upsertGroupGallery({
          group_id: argv.principal,
          gallery_id: argv.gallery,
          is_admin: !!argv.admin,
        });
      } else {
        await db.upsertUserGallery({
          user_id: argv.principal,
          gallery_id: argv.gallery,
          is_admin: !!argv.admin,
        });
      }
      const label = argv.admin ? "admin" : "view";
      console.log(`✓ Granted ${label} to ${target} (${argv.principal}, ${argv.gallery})`);
    }
  )
  .command(
    "revoke <principal> <gallery>",
    "Delete the access row (user_gallery or group_gallery with --group)",
    (y) =>
      y
        .positional("principal", {
          describe: "User ID (or :guest), or group ID with --group",
          type: "string",
          demandOption: true,
        })
        .positional("gallery", { describe: "Gallery ID", type: "string", demandOption: true })
        .option("group", { describe: "Treat <principal> as a group ID", type: "boolean", default: false })
        .option("yes", { describe: "Skip the confirmation prompt", type: "boolean", default: false }),
    async (argv) => {
      checkGalleryId(argv.gallery);
      const target = argv.group ? "group" : "user";
      if (!argv.yes) {
        const ok = await confirm(
          `Revoke ${target} (${argv.principal}, ${argv.gallery})?`
        );
        if (!ok) {
          console.log("Aborted.");
          return;
        }
      }
      if (argv.group) {
        await db.deleteGroupGallery(argv.principal, argv.gallery);
      } else {
        await db.deleteUserGallery(argv.principal, argv.gallery);
      }
      console.log(`✓ Revoked ${target} (${argv.principal}, ${argv.gallery})`);
    }
  )
  .command(
    "audit",
    "Find user_gallery rows whose referenced user or gallery no longer exists; report global-admin count",
    (y) =>
      y
        .option("orphan-users", {
          type: "boolean",
          default: false,
          describe: "Restrict to rows referencing a deleted user",
        })
        .option("orphan-galleries", {
          type: "boolean",
          default: false,
          describe: "Restrict to rows referencing a deleted gallery",
        })
        .option("format", {
          choices: ["table", "ids"] as const,
          default: "table" as const,
        }),
    async (argv) => {
      const orphans = await db.loadOrphanUserGalleryRows();
      const filterFlag = argv["orphan-users"] || argv["orphan-galleries"];
      const want = (kind: "user" | "gallery") => {
        if (!filterFlag) return true;
        if (kind === "user") return argv["orphan-users"];
        return argv["orphan-galleries"];
      };

      if (argv.format === "table") {
        const globalAdmins = await loadGlobalAdmins();
        console.log(
          `Audited ${orphans.length} orphan user_gallery row(s). ` +
            `Global admins: ${globalAdmins.size}${globalAdmins.size > 0 ? " (" + [...globalAdmins].join(", ") + ")" : ""}`
        );
      }

      const print = (
        kind: "user" | "gallery",
        rows: Array<{ userId: string; galleryId: string }>
      ) => {
        if (argv.format === "ids") {
          for (const r of rows) console.log(`${r.userId}\t${r.galleryId}`);
          return;
        }
        console.log(`\nRows referencing a missing ${kind}: ${rows.length}`);
        if (rows.length === 0) return;
        const widths = [
          Math.max("user_id".length, ...rows.map((r) => r.userId.length)),
          Math.max("gallery_id".length, ...rows.map((r) => r.galleryId.length)),
        ];
        console.log(
          `${"user_id".padEnd(widths[0])}  ${"gallery_id".padEnd(widths[1])}`
        );
        console.log(`${"-".repeat(widths[0])}  ${"-".repeat(widths[1])}`);
        for (const r of rows) {
          console.log(`${r.userId.padEnd(widths[0])}  ${r.galleryId.padEnd(widths[1])}`);
        }
      };

      if (want("user")) {
        print(
          "user",
          orphans.filter((o) => o.missing === "user")
        );
      }
      if (want("gallery")) {
        print(
          "gallery",
          orphans.filter((o) => o.missing === "gallery")
        );
      }
    }
  )
  .command(
    "hide-map <principal> <gallery> <state>",
    "Set the map privacy toggle for a user × gallery (or group × gallery with --group)",
    (y) =>
      y
        .positional("principal", {
          describe: "User ID (or :guest), or group ID with --group",
          type: "string",
          demandOption: true,
        })
        .positional("gallery", { describe: "Gallery ID", type: "string", demandOption: true })
        .positional("state", {
          describe:
            "hide = hide the map; show = show the map; default = clear override (inherit)",
          choices: ["hide", "show", "default"] as const,
          demandOption: true,
        })
        .option("group", { describe: "Treat <principal> as a group ID", type: "boolean", default: false }),
    async (argv) => {
      checkGalleryId(argv.gallery);
      const value = argv.state === "hide" ? 1 : argv.state === "show" ? 0 : null;
      if (argv.group) {
        await db.upsertGroupGallery({
          group_id: argv.principal,
          gallery_id: argv.gallery,
          hide_map: value,
        });
      } else {
        await db.upsertUserGallery({
          user_id: argv.principal,
          gallery_id: argv.gallery,
          hide_map: value,
        });
      }
      const label = value === 1 ? "hide" : value === 0 ? "show" : "default (cleared)";
      const target = argv.group ? "group" : "user";
      console.log(`✓ hide_map set to ${label} for ${target} (${argv.principal}, ${argv.gallery})`);
    }
  )
  .parseAsync();
