#!/usr/bin/env -S npx tsx
/* eslint-disable no-console -- interactive CLI tool; console output is the UI */

/**
 * Manage `user_gallery` rows — access level (grant / revoke) and the privacy
 * cascade's `hide_map` toggle (hide-map subcommand). Avoids the previous
 * "edit the DB directly with sqlite3" recipe.
 *
 * Subcommands:
 *
 *   access.ts list [--user <id>] [--gallery <id>]
 *   access.ts grant <user> <gallery> <view|admin>
 *   access.ts revoke <user> <gallery> [--yes]
 *   access.ts hide-map <user> <gallery> <hide|show|default>
 *
 * `:guest` (the sentinel user) and `:all` (the sentinel gallery) are accepted
 * directly as the positional arguments — the operator doesn't have to quote
 * anything.
 */

import { createInterface } from "node:readline/promises";

import yargs from "yargs";
import { hideBin } from "yargs/helpers";

import CONST from "../lib/constants.js";
import db from "../db/index.js";
import type { UserGalleryRow } from "../db/index.js";

const LEVEL_VALUES = { view: CONST.ACCESS_VIEW, admin: CONST.ACCESS_ADMIN } as const;
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
    "grant <user> <gallery> <level>",
    "Grant access for a user × gallery pair",
    (y) =>
      y
        .positional("user", { describe: "User ID (or :guest)", type: "string", demandOption: true })
        .positional("gallery", { describe: "Gallery ID (or :all)", type: "string", demandOption: true })
        .positional("level", {
          describe: "Access level",
          choices: ["view", "admin"] as const,
          demandOption: true,
        }),
    async (argv) => {
      const level = LEVEL_VALUES[argv.level as LevelName];
      await db.upsertUserGallery({
        user_id: argv.user,
        gallery_id: argv.gallery,
        access_level: level,
      });
      console.log(`✓ Granted ${argv.level} access: (${argv.user}, ${argv.gallery})`);
    }
  )
  .command(
    "revoke <user> <gallery>",
    "Delete the row for a user × gallery pair (clears both access and hide_map)",
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
      console.log(`✓ Revoked: (${argv.user}, ${argv.gallery})`);
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
