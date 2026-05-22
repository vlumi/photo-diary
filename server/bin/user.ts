#!/usr/bin/env -S npx tsx
/* eslint-disable no-console -- interactive CLI tool; console output is the UI */

/**
 * Manage local user accounts.
 *
 * Subcommands:
 *
 *   user.ts list
 *   user.ts passwd <id> [password] [--keep-secret]
 *   user.ts delete <id> [--yes]
 *
 * `passwd` upserts the user — creates if missing, updates the password if
 * present. Omit `[password]` to be prompted interactively without echo
 * (preferred — avoids leaving the password in shell history or `ps`). When
 * scripting, pass the password as the positional. By default the user's
 * `secret` is rotated too, which invalidates every existing JWT for them
 * (correct for "password lost / leaked" cases). Pass `--keep-secret` to opt
 * out and keep sessions alive across the change.
 *
 * `delete` cascades to the user's `user_gallery` rows (access + hide_map).
 * Confirmation prompt unless `--yes` is given.
 *
 * Access level changes are managed via `bin/access.ts level …`; this script
 * doesn't touch `user_gallery` access at all (except to cascade-delete).
 */

import { randomUUID } from "node:crypto";
import { createInterface } from "node:readline/promises";

import bcrypt from "bcrypt";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";

import CONST from "../lib/constants.js";
import db from "../db/index.js";

const SALT_ROUNDS = 10;

const confirm = async (prompt: string): Promise<boolean> => {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    const answer = await rl.question(`${prompt} [y/N] `);
    return /^y(es)?$/i.test(answer.trim());
  } finally {
    rl.close();
  }
};

// Read a line from stdin without echoing it back to the terminal — for
// passwords. Node has no built-in no-echo helper, so we flip stdin into raw
// mode and consume bytes manually until enter / EOF. Handles paste (multi-
// char chunks), backspace, and Ctrl-C.
const CTRL_C = String.fromCharCode(0x03); // ETX — abort
const EOF_CHAR = String.fromCharCode(0x04); // EOT — submit (Ctrl-D)
const DEL = String.fromCharCode(0x7f); // DEL — backspace on most terminals
const promptHidden = (prompt: string): Promise<string> => {
  if (!process.stdin.isTTY) {
    console.error(
      "Password not provided and stdin is not a TTY. Pass the password as a positional argument when scripting:"
    );
    console.error("  user.ts passwd <id> <password>");
    process.exit(1);
  }
  process.stdout.write(prompt);
  return new Promise((resolve) => {
    let value = "";
    const stdin = process.stdin;
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding("utf8");
    const cleanup = () => {
      stdin.setRawMode(false);
      stdin.pause();
      stdin.removeListener("data", onData);
    };
    const onData = (chunk: Buffer | string) => {
      for (const ch of chunk.toString()) {
        if (ch === CTRL_C) {
          // Ctrl-C: behave like the shell would (abort, no resolve).
          cleanup();
          process.stdout.write("\n");
          process.exit(130);
        }
        if (ch === "\r" || ch === "\n" || ch === EOF_CHAR) {
          cleanup();
          process.stdout.write("\n");
          resolve(value);
          return;
        }
        if (ch === DEL || ch === "\b") {
          value = value.slice(0, -1);
          continue;
        }
        value += ch;
      }
    };
    stdin.on("data", onData);
  });
};

const promptForNewPassword = async (): Promise<string> => {
  const first = await promptHidden("New password: ");
  if (first.length === 0) {
    console.error("Password cannot be empty.");
    process.exit(1);
  }
  const second = await promptHidden("Confirm:      ");
  if (first !== second) {
    console.error("Passwords do not match. Aborted.");
    process.exit(1);
  }
  return first;
};

const formatTable = (rows: string[][]): string => {
  if (rows.length <= 1) return rows[0]?.join("  ") ?? "";
  const widths = rows[0].map((_, col) => Math.max(...rows.map((r) => r[col].length)));
  return rows
    .map((row, i) => {
      const padded = row.map((cell, c) => cell.padEnd(widths[c])).join("  ");
      return i === 0 ? `${padded}\n${widths.map((w) => "-".repeat(w)).join("  ")}` : padded;
    })
    .join("\n");
};

await yargs(hideBin(process.argv))
  .scriptName("user.ts")
  .strict()
  .demandCommand(1, "Specify a subcommand: list, passwd, or delete")
  .command(
    "list",
    "Print every user as a table with their admin flag",
    (y) => y,
    async () => {
      const users = (await db.loadUsers()) as Array<{ id: string }>;
      const rows: string[][] = [["user", "admin"]];
      for (const user of users) {
        if (!user.id) continue;
        const accessRows = await db.loadUserGalleryRows({
          userId: user.id,
          galleryId: CONST.SPECIAL_GALLERY_ALL,
        });
        const isAdmin = accessRows.some((r) => r.access_level === CONST.ACCESS_ADMIN);
        rows.push([user.id, isAdmin ? "yes" : "no"]);
      }
      console.log(rows.length === 1 ? "(no users)" : formatTable(rows));
    }
  )
  .command(
    "passwd <id> [password]",
    "Set a user's password (creates the user if missing; rotates secret by default)",
    (y) =>
      y
        .positional("id", { describe: "User ID", type: "string", demandOption: true })
        .positional("password", {
          describe:
            "Password; omit to be prompted interactively without echo (preferred — avoids ps/shell-history leaks)",
          type: "string",
        })
        .option("keep-secret", {
          describe: "Don't rotate the user's secret (keeps existing JWT sessions valid)",
          type: "boolean",
          default: false,
        }),
    async (argv) => {
      const password = argv.password ?? (await promptForNewPassword());
      const hash = await bcrypt.hash(password, SALT_ROUNDS);
      const existing = await db
        .loadUser(argv.id)
        .then((u) => u as { id: string })
        .catch(() => null);

      if (existing) {
        const updates: { password: string; secret?: string } = { password: hash };
        if (!argv["keep-secret"]) updates.secret = randomUUID();
        await db.updateUser(existing.id, updates);
        console.log(
          argv["keep-secret"]
            ? `✓ Updated password for "${argv.id}"; existing sessions preserved.`
            : `✓ Updated password for "${argv.id}"; existing sessions invalidated (secret rotated).`
        );
      } else {
        await db.createUser({ id: argv.id, password: hash, secret: randomUUID() });
        console.log(`✓ Created user "${argv.id}".`);
      }
    }
  )
  .command(
    "delete <id>",
    "Delete the user and cascade their user_gallery rows",
    (y) =>
      y
        .positional("id", { describe: "User ID", type: "string", demandOption: true })
        .option("yes", {
          describe: "Skip the confirmation prompt",
          type: "boolean",
          default: false,
        }),
    async (argv) => {
      const exists = await db
        .loadUser(argv.id)
        .then(() => true)
        .catch(() => false);
      if (!exists) {
        console.error(`User "${argv.id}" not found.`);
        process.exit(1);
      }
      const accessRows = await db.loadUserGalleryRows({ userId: argv.id });

      if (!argv.yes) {
        const summary = `user "${argv.id}"${accessRows.length > 0 ? ` and ${accessRows.length} user_gallery row(s)` : ""}`;
        const ok = await confirm(`Delete ${summary}?`);
        if (!ok) {
          console.log("Aborted.");
          return;
        }
      }

      for (const row of accessRows) {
        await db.deleteUserGallery(row.user_id, row.gallery_id);
      }
      await db.deleteUser(argv.id);
      console.log(
        `✓ Deleted user "${argv.id}"${accessRows.length > 0 ? ` (${accessRows.length} user_gallery row(s) cascaded)` : ""}.`
      );
    }
  )
  .parseAsync();
