#!/usr/bin/env -S npx tsx
/* eslint-disable no-console -- interactive CLI tool; console output is the UI */

/**
 * Manage local user accounts. Three modes (mutually exclusive):
 *
 *   user.ts --list
 *   user.ts -u <id> -p <password> [--keep-secret]
 *   user.ts -d <id> [--yes]
 *
 * Setting `-u`/`-p` upserts the user — creates if missing, updates the
 * password if present. By default the user's `secret` is rotated too, which
 * invalidates every existing JWT for them (correct behavior for "password
 * lost / leaked" cases). Pass `--keep-secret` to opt out and keep sessions
 * alive across the password change.
 *
 * Delete cascades to the user's `user_gallery` rows (access + hide_map).
 * Confirmation prompt unless `--yes` is given.
 *
 * Access level changes are managed via `bin/access.ts level …`; this script
 * doesn't touch `user_gallery` access at all.
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

const listUsers = async (): Promise<void> => {
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
};

const setPassword = async (
  userId: string,
  password: string,
  keepSecret: boolean
): Promise<void> => {
  const hash = await bcrypt.hash(password, SALT_ROUNDS);
  const existing = await db
    .loadUser(userId)
    .then((u) => u as { id: string })
    .catch(() => null);

  if (existing) {
    const updates: { password: string; secret?: string } = { password: hash };
    if (!keepSecret) updates.secret = randomUUID();
    await db.updateUser(existing.id, updates);
    console.log(
      keepSecret
        ? `✓ Updated password for "${userId}"; existing sessions preserved.`
        : `✓ Updated password for "${userId}"; existing sessions invalidated (secret rotated).`
    );
  } else {
    await db.createUser({ id: userId, password: hash, secret: randomUUID() });
    console.log(`✓ Created user "${userId}".`);
  }
};

const deleteUser = async (userId: string, skipConfirm: boolean): Promise<void> => {
  const exists = await db
    .loadUser(userId)
    .then(() => true)
    .catch(() => false);
  if (!exists) {
    console.error(`User "${userId}" not found.`);
    process.exit(1);
  }
  const accessRows = await db.loadUserGalleryRows({ userId });

  if (!skipConfirm) {
    const summary = `user "${userId}"${accessRows.length > 0 ? ` and ${accessRows.length} user_gallery row(s)` : ""}`;
    const ok = await confirm(`Delete ${summary}?`);
    if (!ok) {
      console.log("Aborted.");
      return;
    }
  }

  for (const row of accessRows) {
    await db.deleteUserGallery(row.user_id, row.gallery_id);
  }
  await db.deleteUser(userId);
  console.log(
    `✓ Deleted user "${userId}"${accessRows.length > 0 ? ` (${accessRows.length} user_gallery row(s) cascaded)` : ""}.`
  );
};

const argv = yargs(hideBin(process.argv))
  .alias("l", "list")
  .describe("l", "List users (with admin flag)")
  .boolean("l")
  .alias("u", "user")
  .nargs("u", 1)
  .describe("u", "User ID (with --password: upsert; pair with --keep-secret to preserve sessions)")
  .string("u")
  .alias("p", "password")
  .nargs("p", 1)
  .describe("p", "Password (bcrypt-hashed before storage)")
  .string("p")
  .describe(
    "keep-secret",
    "Don't rotate the user's secret on password change (keeps existing JWT sessions valid)"
  )
  .boolean("keep-secret")
  .alias("d", "delete")
  .nargs("d", 1)
  .describe("d", "Delete the user and cascade their user_gallery rows")
  .string("d")
  .alias("y", "yes")
  .describe("y", "Skip the confirmation prompt for --delete")
  .boolean("y")
  .check((parsed) => {
    const modes = [
      parsed.list ? 1 : 0,
      parsed.delete ? 1 : 0,
      parsed.user && parsed.password ? 1 : 0,
    ].reduce<number>((a, b) => a + b, 0);
    if (modes !== 1) {
      throw new Error(
        "Exactly one of: --list; --delete <id>; --user <id> --password <pw> is required."
      );
    }
    return true;
  })
  .strict()
  .usage("Usage: $0 [options]")
  .parseSync();

if (argv.list) {
  await listUsers();
} else if (argv.delete) {
  await deleteUser(argv.delete as string, argv.yes as boolean);
} else if (argv.user && argv.password) {
  await setPassword(
    argv.user as string,
    argv.password as string,
    Boolean(argv["keep-secret"])
  );
}
