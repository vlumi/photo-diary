#!/usr/bin/env -S npx tsx
/* eslint-disable no-console -- interactive CLI tool; console output is the UI */

/**
 * Read and write rows in the `meta` table without resorting to curl
 * against `/api/v1/meta` or raw `UPDATE meta SET …` SQL.
 *
 * Subcommands:
 *
 *   meta.ts list
 *   meta.ts get <key>                 (exit 1 if missing)
 *   meta.ts set <key> <value> [--force]
 *
 * Unknown keys are rejected by default. `--force` adds a brand-new key;
 * the schema-seeded set is `instance_name`, `instance_description`,
 * `instance_cdn`, `instance_image`. `schema_version` is the migration
 * runner's cursor and is hard-blocked here even with --force; reach
 * for raw SQL if you really need to touch it.
 */

import yargs from "yargs";
import { hideBin } from "yargs/helpers";

import db from "../db/index.js";

const KNOWN_KEYS = new Set([
  "instance_name",
  "instance_description",
  "instance_cdn",
  "instance_image",
]);
const PROTECTED_KEYS = new Set(["schema_version"]);

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

await yargs(hideBin(process.argv))
  .scriptName("meta.ts")
  .locale("en")
  .strict()
  .demandCommand(1, "Specify a subcommand: list, get, or set")
  .command(
    "list",
    "Print every row in meta as a table",
    (y) => y,
    async () => {
      const metas = await db.loadMetas();
      const entries = Object.entries(metas);
      if (entries.length === 0) {
        console.log("(no rows)");
        return;
      }
      const rows: string[][] = [["key", "value"]];
      for (const [key, value] of entries) rows.push([key, value]);
      console.log(formatTable(rows));
    }
  )
  .command(
    "get <key>",
    "Print one value (exit 1 if the key is missing)",
    (y) =>
      y.positional("key", {
        describe: "Meta key",
        type: "string",
        demandOption: true,
      }),
    async (argv) => {
      const meta = await db
        .loadMeta(argv.key)
        .then((m) => m as Record<string, string>)
        .catch(() => null);
      if (!meta) {
        console.error(`Key "${argv.key}" not found.`);
        process.exit(1);
      }
      console.log(meta[argv.key] ?? "");
    }
  )
  .command(
    "set <key> <value>",
    "Upsert a meta row (rejects unknown keys without --force)",
    (y) =>
      y
        .positional("key", {
          describe: "Meta key",
          type: "string",
          demandOption: true,
        })
        .positional("value", {
          describe: "Value to write (use empty string to clear)",
          type: "string",
          demandOption: true,
        })
        .option("force", {
          describe:
            "Allow setting an unknown key (not in the schema-seeded set)",
          type: "boolean",
          default: false,
        }),
    async (argv) => {
      const key = argv.key;
      if (PROTECTED_KEYS.has(key)) {
        console.error(
          `"${key}" is managed by the migration runner; refusing to touch it. Use raw SQL if you really must.`
        );
        process.exit(1);
      }
      const isKnown = KNOWN_KEYS.has(key);
      if (!isKnown && !argv.force) {
        console.error(`Unknown key "${key}". Known keys:`);
        for (const k of KNOWN_KEYS) console.error(`  ${k}`);
        console.error("Re-run with --force to add a brand-new key.");
        process.exit(1);
      }
      const existing = await db
        .loadMeta(key)
        .then((m) => m as Record<string, string>)
        .catch(() => null);
      if (existing) {
        await db.updateMeta(key, { value: argv.value });
        console.log(`✓ Updated ${key}.`);
      } else {
        await db.createMeta({ key, value: argv.value });
        console.log(`✓ Created ${key}.`);
      }
    }
  )
  .command(
    "audit",
    "Find meta rows with empty values (known keys) or unknown keys (schema drift)",
    (y) =>
      y
        .option("missing", {
          type: "boolean",
          default: false,
          describe:
            "Restrict to known keys whose value is empty",
        })
        .option("unknown", {
          type: "boolean",
          default: false,
          describe:
            "Restrict to keys not in the schema-seeded set (added via `set --force` or raw SQL)",
        })
        .option("format", {
          choices: ["table", "ids"] as const,
          default: "table" as const,
        }),
    async (argv) => {
      const metas = await db.loadMetas();
      const entries = Object.entries(metas);
      const filterFlag = argv.missing || argv.unknown;
      const want = (key: string) => !filterFlag || argv[key];

      if (argv.format === "table") {
        console.log(`Audited ${entries.length} meta row(s).`);
      }

      const print = (title: string, rows: Array<[string, string]>) => {
        if (argv.format === "ids") {
          for (const [k] of rows) console.log(k);
          return;
        }
        console.log(`\n${title}: ${rows.length}`);
        if (rows.length === 0) return;
        console.log(formatTable([["key", "value"], ...rows]));
      };

      if (want("missing")) {
        const missing = entries.filter(
          ([k, v]) => KNOWN_KEYS.has(k) && (v === null || v === undefined || v === "")
        );
        print("Known keys with empty values", missing);
      }

      if (want("unknown")) {
        const unknown = entries.filter(
          ([k]) => !KNOWN_KEYS.has(k) && !PROTECTED_KEYS.has(k)
        );
        print(
          "Unknown keys (not in the schema-seeded set; `schema_version` excluded)",
          unknown
        );
      }
    }
  )
  .parseAsync();
