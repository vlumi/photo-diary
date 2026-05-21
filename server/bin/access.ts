#!/usr/bin/env -S npx tsx
/* eslint-disable no-console -- interactive CLI tool; console output is the UI */

/**
 * Manage `user_gallery` rows — access level (level / unset subcommands) and
 * the privacy cascade's `hide_map` toggle (hide-map subcommand). Avoids the
 * previous "edit the DB directly with sqlite3" recipe.
 *
 * Subcommands:
 *
 *   access.ts list [--user <id>] [--gallery <id>]
 *   access.ts level <user> <gallery> <none|view|admin>
 *   access.ts unset <user> <gallery> [--yes]
 *   access.ts hide-map <user> <gallery> <hide|show|default>
 *
 * `:guest` (the sentinel user) and `:all` (the sentinel gallery) are accepted
 * directly as the positional arguments — the operator doesn't have to quote
 * anything.
 *
 * `level … none` and `unset` differ: `level … none` writes a row with
 * access_level=0 and stops the cascade at that row; `unset` deletes the row
 * entirely and lets the cascade fall through to less-specific rows.
 */

import { createInterface } from "node:readline/promises";

import yargs from "yargs";
import { hideBin } from "yargs/helpers";

import CONST from "../lib/constants.js";
import db from "../db/index.js";
import type { UserGalleryRow } from "../db/index.js";

const LEVEL_VALUES = {
  none: CONST.ACCESS_NONE,
  view: CONST.ACCESS_VIEW,
  admin: CONST.ACCESS_ADMIN,
} as const;
type LevelName = keyof typeof LEVEL_VALUES;
const levelName = (value: number | null): string => {
  if (value === null) return "—";
  if (value === CONST.ACCESS_ADMIN) return "admin";
  if (value === CONST.ACCESS_VIEW) return "view";
  if (value === CONST.ACCESS_NONE) return "none";
  return String(value);
};
const hideMapName = (value: number | null): string => {
  if (value === null) return "—";
  return value === 1 ? "hide" : "show";
};

const formatRows = (rows: UserGalleryRow[]): string => {
  if (rows.length === 0) return "(no rows)";
  const header = ["user", "gallery", "access", "hide_map"];
  const lines: string[][] = [header];
  for (const r of rows) {
    lines.push([r.user_id, r.gallery_id, levelName(r.access_level), hideMapName(r.hide_map)]);
  }
  const widths = header.map((_, col) => Math.max(...lines.map((l) => l[col].length)));
  return lines
    .map((row, i) => {
      const padded = row.map((cell, c) => cell.padEnd(widths[c])).join("  ");
      return i === 0 ? `${padded}\n${widths.map((w) => "-".repeat(w)).join("  ")}` : padded;
    })
    .join("\n");
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
  .strict()
  .demandCommand(1, "Specify a subcommand: list, grant, revoke, or hide-map")
  .command(
    "list",
    "Print existing user_gallery rows (optionally filtered)",
    (y) =>
      y
        .option("user", { describe: "Filter to one user ID (e.g. :guest)", type: "string" })
        .option("gallery", { describe: "Filter to one gallery ID (e.g. :all)", type: "string" }),
    async (argv) => {
      const rows = await db.loadUserGalleryRows({
        userId: argv.user,
        galleryId: argv.gallery,
      });
      console.log(formatRows(rows));
    }
  )
  .command(
    "level <user> <gallery> <level>",
    "Set the access level on a user × gallery row (use 'none' for explicit deny)",
    (y) =>
      y
        .positional("user", { describe: "User ID (or :guest)", type: "string", demandOption: true })
        .positional("gallery", { describe: "Gallery ID (or :all)", type: "string", demandOption: true })
        .positional("level", {
          describe:
            "Access level — 'none' explicitly denies at this row (cascade stops here)",
          choices: ["none", "view", "admin"] as const,
          demandOption: true,
        }),
    async (argv) => {
      const level = LEVEL_VALUES[argv.level as LevelName];
      await db.upsertUserGallery({
        user_id: argv.user,
        gallery_id: argv.gallery,
        access_level: level,
      });
      console.log(`✓ Set access to ${argv.level}: (${argv.user}, ${argv.gallery})`);
    }
  )
  .command(
    "unset <user> <gallery>",
    "Delete the row entirely (cascade falls through to less-specific rows)",
    (y) =>
      y
        .positional("user", { describe: "User ID (or :guest)", type: "string", demandOption: true })
        .positional("gallery", { describe: "Gallery ID (or :all)", type: "string", demandOption: true })
        .option("yes", { describe: "Skip the confirmation prompt", type: "boolean", default: false }),
    async (argv) => {
      if (!argv.yes) {
        const ok = await confirm(`Delete user_gallery row (${argv.user}, ${argv.gallery})?`);
        if (!ok) {
          console.log("Aborted.");
          return;
        }
      }
      await db.deleteUserGallery(argv.user, argv.gallery);
      console.log(`✓ Unset: (${argv.user}, ${argv.gallery})`);
    }
  )
  .command(
    "hide-map <user> <gallery> <state>",
    "Set the map privacy toggle for a user × gallery pair",
    (y) =>
      y
        .positional("user", { describe: "User ID (or :guest)", type: "string", demandOption: true })
        .positional("gallery", { describe: "Gallery ID (or :all)", type: "string", demandOption: true })
        .positional("state", {
          describe:
            "hide = hide the map; show = show the map; default = clear override (inherit from less-specific row)",
          choices: ["hide", "show", "default"] as const,
          demandOption: true,
        }),
    async (argv) => {
      const value = argv.state === "hide" ? 1 : argv.state === "show" ? 0 : null;
      await db.upsertUserGallery({
        user_id: argv.user,
        gallery_id: argv.gallery,
        hide_map: value,
      });
      const label = value === 1 ? "hide" : value === 0 ? "show" : "default (cleared)";
      console.log(`✓ hide_map set to ${label}: (${argv.user}, ${argv.gallery})`);
    }
  )
  .parseAsync();
