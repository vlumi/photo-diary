#!/usr/bin/env -S npx tsx
/* eslint-disable no-console -- interactive CLI tool; console output is the UI */

/**
 * Manage local user accounts and what each user can access.
 *
 * Identity:
 *   user.ts list                        # every user + global-admin flag
 *   user.ts passwd <id> [password] [--keep-secret]
 *   user.ts make-admin <id>             # set user.is_admin = 1
 *   user.ts revoke-admin <id>           # set user.is_admin = 0
 *   user.ts delete <id> [--yes]         # cascade user_gallery + sessions
 *
 * Access:
 *   user.ts grant <user> <gallery> [--editor]   # upsert user_gallery row
 *   user.ts revoke <user> <gallery> [--yes]    # delete user_gallery row
 *   user.ts hide-map <user> <gallery> <hide|show|default>
 *   user.ts grants [<user>]             # direct user_gallery rows
 *   user.ts access [<user>]             # effective access (resolves direct
 *                                       # + group memberships + :guest)
 *
 *   user.ts audit                       # no-access / no-admin / orphan
 *                                       # user_gallery rows
 *
 * Group-side ACL lives in `bin/group.ts`; per-gallery access slice in
 * `bin/gallery.ts access <gallery>`.
 */

import { randomUUID } from "node:crypto";
import { createInterface } from "node:readline/promises";

import bcrypt from "bcrypt";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";

import { SALT_ROUNDS } from "../lib/bcrypt-rounds.js";
import db from "../db/index.js";

const confirm = async (prompt: string): Promise<boolean> => {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    const answer = await rl.question(`${prompt} [y/N] `);
    return /^y(es)?$/i.test(answer.trim());
  } finally {
    rl.close();
  }
};

// No-echo stdin read for passwords: flip raw mode and consume bytes until
// enter/EOF. Node has no built-in for this.
const CTRL_C = String.fromCharCode(0x03);
const EOF_CHAR = String.fromCharCode(0x04);
const DEL = String.fromCharCode(0x7f);
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

const requireRealGalleryId = (galleryId: string) => {
  if (galleryId.startsWith(":")) {
    console.error(
      `✗ ${galleryId} is not a real gallery (":"-prefix is reserved). For global admin, use \`make-admin\`.`
    );
    process.exit(1);
  }
};

const hideMapLabel = (value: number | null): string => {
  if (value === null) return "—";
  return value === 1 ? "hide" : "show";
};
const accessLabel = (isEditor: number | boolean): string =>
  isEditor ? "editor" : "view";

// Effective per-gallery access for one user: walks direct user_gallery
// rows, group_gallery rows for every group the user is in, and the
// :guest fallback. Returns one entry per gallery the user can reach,
// with the resolved level and the contributing sources for tracing.
const effectiveAccessFor = async (
  userId: string
): Promise<
  Array<{ gallery_id: string; is_editor: boolean; sources: string[] }>
> => {
  const user = (await db
    .loadUser(userId)
    .catch(() => null)) as { id: string; is_admin?: number | boolean } | null;
  if (!user) return [];
  const galleries = (await db.loadGalleries()) as Array<{ id: string }>;
  if (user.is_admin) {
    return galleries.map((g) => ({
      gallery_id: g.id,
      is_editor: true,
      sources: ["is_admin"],
    }));
  }
  const userGroups = await db.loadUserGroups(userId);
  const out: Array<{
    gallery_id: string;
    is_editor: boolean;
    sources: string[];
  }> = [];
  for (const g of galleries) {
    const sources: string[] = [];
    let level = false;
    const direct = await db.loadUserGalleryRows({
      userId,
      galleryId: g.id,
    });
    if (direct.length > 0) {
      sources.push("direct");
      if (direct[0].is_editor) level = true;
    }
    for (const groupId of userGroups) {
      const gr = await db.loadGroupGalleryRows({
        groupId,
        galleryId: g.id,
      });
      if (gr.length > 0) {
        sources.push(`group:${groupId}`);
        if (gr[0].is_editor) level = true;
      }
    }
    const guest = await db.loadUserGalleryRows({
      userId: ":guest",
      galleryId: g.id,
    });
    if (guest.length > 0) {
      sources.push(":guest");
      if (guest[0].is_editor) level = true;
    }
    if (sources.length > 0) {
      out.push({ gallery_id: g.id, is_editor: level, sources });
    }
  }
  return out;
};

await yargs(hideBin(process.argv))
  .scriptName("user.ts")
  .locale("en")
  .strict()
  .demandCommand(
    1,
    "Specify a subcommand: list, passwd, make-admin, revoke-admin, delete, grant, revoke, hide-map, grants, access, or audit"
  )
  .command(
    "list",
    "Print every user as a table with their global-admin flag",
    (y) => y,
    async () => {
      const users = (await db.loadUsers()) as Array<{
        id: string;
        name?: string;
        is_admin?: number | boolean;
      }>;
      const rows: string[][] = [["user", "name", "admin"]];
      for (const user of users) {
        if (!user.id) continue;
        rows.push([user.id, user.name ?? user.id, user.is_admin ? "yes" : "no"]);
      }
      console.log(rows.length === 1 ? "(no users)" : formatTable(rows));
    }
  )
  .command(
    "make-admin <id>",
    "Promote a user to global admin (bypasses all access checks)",
    (y) =>
      y.positional("id", { describe: "User ID", type: "string", demandOption: true }),
    async (argv) => {
      const existing = await db
        .loadUser(argv.id)
        .then((u) => u as { id: string })
        .catch(() => null);
      if (!existing) {
        console.error(`✗ User "${argv.id}" doesn't exist.`);
        process.exit(1);
      }
      await db.updateUser(argv.id, { is_admin: 1 });
      console.log(`✓ "${argv.id}" is now a global admin.`);
    }
  )
  .command(
    "revoke-admin <id>",
    "Revoke a user's global-admin flag (does not change per-gallery grants)",
    (y) =>
      y.positional("id", { describe: "User ID", type: "string", demandOption: true }),
    async (argv) => {
      const existing = await db
        .loadUser(argv.id)
        .then((u) => u as { id: string })
        .catch(() => null);
      if (!existing) {
        console.error(`✗ User "${argv.id}" doesn't exist.`);
        process.exit(1);
      }
      await db.updateUser(argv.id, { is_admin: 0 });
      console.log(`✓ Revoked global-admin from "${argv.id}".`);
    }
  )
  .command(
    "set-name <id> <name>",
    "Set the user's display name (defaults to id at create time)",
    (y) =>
      y
        .positional("id", { describe: "User ID", type: "string", demandOption: true })
        .positional("name", { describe: "Display name", type: "string", demandOption: true }),
    async (argv) => {
      const existing = await db
        .loadUser(argv.id)
        .then((u) => u as { id: string })
        .catch(() => null);
      if (!existing) {
        console.error(`✗ User "${argv.id}" doesn't exist.`);
        process.exit(1);
      }
      await db.updateUser(argv.id, { name: argv.name });
      console.log(`✓ Set name of "${argv.id}" to "${argv.name}".`);
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
        if (!argv["keep-secret"]) {
          // The secret-rotation hammer also has to clear the refresh-token
          // sessions: refresh tokens aren't signed against the user's secret,
          // so without this cascade a session could mint a new (now-valid)
          // access token under the new secret. Same intent as the previous
          // "all sessions invalidated" message — now it actually is.
          await db.deleteUserSessions(existing.id);
        }
        console.log(
          argv["keep-secret"]
            ? `✓ Updated password for "${argv.id}"; existing sessions preserved.`
            : `✓ Updated password for "${argv.id}"; existing sessions invalidated (secret rotated).`
        );
      } else {
        await db.createUser({
          id: argv.id,
          name: argv.id,
          password: hash,
          secret: randomUUID(),
          is_admin: 0,
        });
        console.log(`✓ Created user "${argv.id}".`);
      }
    }
  )
  .command(
    "grant <user> <gallery>",
    "Grant a user view (or gallery-editor with --editor) on a gallery. --private-view extends view to private-flagged photos. Idempotent — re-running with different flags toggles them.",
    (y) =>
      y
        .positional("user", { describe: "User ID (or :guest)", type: "string", demandOption: true })
        .positional("gallery", { describe: "Gallery ID", type: "string", demandOption: true })
        .option("editor", { describe: "Grant gallery-editor instead of view", type: "boolean", default: false })
        .option("private-view", {
          describe:
            "Extend view to gallery_photo rows flagged is_private (no effect with --editor; editors always see private)",
          type: "boolean",
          default: false,
        }),
    async (argv) => {
      requireRealGalleryId(argv.gallery);
      await db.upsertUserGallery({
        user_id: argv.user,
        gallery_id: argv.gallery,
        is_editor: !!argv.editor,
        can_see_private: !!argv["private-view"],
      });
      const tier = argv.editor ? "editor" : "view";
      const privacy = argv["private-view"] ? " + private-view" : "";
      console.log(
        `✓ Granted ${tier}${privacy} to user (${argv.user}, ${argv.gallery})`
      );
    }
  )
  .command(
    "revoke <user> <gallery>",
    "Delete the user_gallery row (revokes all access at this scope)",
    (y) =>
      y
        .positional("user", { describe: "User ID (or :guest)", type: "string", demandOption: true })
        .positional("gallery", { describe: "Gallery ID", type: "string", demandOption: true })
        .option("yes", { describe: "Skip the confirmation prompt", type: "boolean", default: false }),
    async (argv) => {
      requireRealGalleryId(argv.gallery);
      if (!argv.yes) {
        const ok = await confirm(`Revoke user (${argv.user}, ${argv.gallery})?`);
        if (!ok) {
          console.log("Aborted.");
          return;
        }
      }
      await db.deleteUserGallery(argv.user, argv.gallery);
      console.log(`✓ Revoked user (${argv.user}, ${argv.gallery})`);
    }
  )
  .command(
    "hide-map <user> <gallery> <state>",
    "Set the map privacy toggle for a user × gallery pair",
    (y) =>
      y
        .positional("user", { describe: "User ID (or :guest)", type: "string", demandOption: true })
        .positional("gallery", { describe: "Gallery ID", type: "string", demandOption: true })
        .positional("state", {
          describe:
            "hide = hide the map; show = show the map; default = clear override (inherit)",
          choices: ["hide", "show", "default"] as const,
          demandOption: true,
        }),
    async (argv) => {
      requireRealGalleryId(argv.gallery);
      const value = argv.state === "hide" ? 1 : argv.state === "show" ? 0 : null;
      await db.upsertUserGallery({
        user_id: argv.user,
        gallery_id: argv.gallery,
        hide_map: value,
      });
      const label = value === 1 ? "hide" : value === 0 ? "show" : "default (cleared)";
      console.log(`✓ hide_map set to ${label} for user (${argv.user}, ${argv.gallery})`);
    }
  )
  .command(
    "grants [user]",
    "Print direct user_gallery rows (optionally filtered to one user) plus global admins",
    (y) =>
      y
        .positional("user", { describe: "User ID (or :guest)", type: "string" })
        .option("gallery", { describe: "Filter to one gallery ID", type: "string" }),
    async (argv) => {
      const rows = await db.loadUserGalleryRows({
        userId: argv.user,
        galleryId: argv.gallery,
      });
      const adminFlag = (await db.loadUsers()) as Array<{
        id: string;
        is_admin?: number | boolean;
      }>;
      const globals = new Set(
        adminFlag
          .filter((u) => !!u.is_admin && (!argv.user || u.id === argv.user))
          .map((u) => u.id)
      );
      const showGlobals = !argv.gallery;
      if (rows.length === 0 && (!showGlobals || globals.size === 0)) {
        console.log("(no rows)");
        return;
      }
      const lines: string[][] = [["user", "gallery", "access", "hide_map"]];
      for (const r of rows) {
        const annotated = globals.has(r.user_id)
          ? `${r.user_id} (global admin)`
          : r.user_id;
        lines.push([
          annotated,
          r.gallery_id,
          accessLabel(r.is_editor),
          hideMapLabel(r.hide_map),
        ]);
      }
      if (showGlobals) {
        for (const id of globals) {
          if (rows.some((r) => r.user_id === id)) continue;
          lines.push([`${id} (global admin)`, "—", "—", "—"]);
        }
      }
      console.log(formatTable(lines));
    }
  )
  .command(
    "access [user]",
    "Print effective access for a user (direct + inherited via groups + :guest), with the contributing sources",
    (y) =>
      y.positional("user", { describe: "User ID (omit to scan every user)", type: "string" }),
    async (argv) => {
      const targets: string[] = argv.user
        ? [argv.user]
        : ((await db.loadUsers()) as Array<{ id: string }>).map((u) => u.id);
      let printed = false;
      for (const userId of targets) {
        const rows = await effectiveAccessFor(userId);
        if (rows.length === 0) continue;
        if (printed) console.log();
        printed = true;
        console.log(`user: ${userId}`);
        const lines: string[][] = [["gallery", "access", "sources"]];
        for (const r of rows) {
          lines.push([r.gallery_id, accessLabel(r.is_editor), r.sources.join(", ")]);
        }
        console.log(formatTable(lines));
      }
      if (!printed) console.log("(no effective access)");
    }
  )
  .command(
    "audit",
    "Find users with no access, warn if the instance has no admin, or report user_gallery rows whose user is gone",
    (y) =>
      y
        .option("no-access", {
          type: "boolean",
          default: false,
          describe: "Restrict to users with no user_gallery rows (can't see anything)",
        })
        .option("no-admin", {
          type: "boolean",
          default: false,
          describe: "Restrict to the no-admin-found warning",
        })
        .option("orphan-grants", {
          type: "boolean",
          default: false,
          describe: "Restrict to user_gallery rows whose user_id is gone",
        })
        .option("format", {
          choices: ["table", "ids"] as const,
          default: "table" as const,
        }),
    async (argv) => {
      const users = (await db.loadUsers()) as Array<{
        id: string;
        is_admin?: number | boolean;
      }>;
      const filterFlag =
        argv["no-access"] || argv["no-admin"] || argv["orphan-grants"];
      const want = (key: string) => !filterFlag || argv[key];

      if (argv.format === "table") {
        console.log(`Audited ${users.length} user(s).`);
      }

      if (want("no-access")) {
        const noAccess: Array<{ id: string }> = [];
        for (const user of users) {
          if (!user.id) continue;
          const accessRows = await db.loadUserGalleryRows({ userId: user.id });
          if (accessRows.length === 0) noAccess.push(user);
        }
        if (argv.format === "ids") {
          for (const u of noAccess) console.log(u.id);
        } else {
          console.log(`\nUsers with no user_gallery rows: ${noAccess.length}`);
          if (noAccess.length > 0) {
            const rows: string[][] = [["user"]];
            for (const u of noAccess) rows.push([u.id]);
            console.log(formatTable(rows));
          }
        }
      }

      if (want("no-admin")) {
        const anyAdmin = (users as Array<{ is_admin?: number | boolean }>).some(
          (u) => !!u.is_admin
        );
        if (argv.format === "table") {
          console.log(
            `\nInstance has global admin: ${anyAdmin ? "yes" : "NO — no user.is_admin = true"}`
          );
        } else if (!anyAdmin) {
          // ids format: emit the warning on stderr so stdout stays empty
          // when there are no rows of concern.
          console.error("WARNING: no user has is_admin = true");
        }
      }

      if (want("orphan-grants")) {
        // user_gallery rows whose user_id no longer maps to a user row.
        // :guest is a virtual user that's never in the user table; skip it.
        const knownUsers = new Set(users.map((u) => u.id));
        const orphans = (await db.loadOrphanUserGalleryRows()).filter(
          (o) => o.missing === "user" && !knownUsers.has(o.userId)
        );
        if (argv.format === "ids") {
          for (const o of orphans) console.log(`${o.userId}\t${o.galleryId}`);
        } else {
          console.log(`\nuser_gallery rows for a missing user: ${orphans.length}`);
          if (orphans.length > 0) {
            const rows: string[][] = [["user_id", "gallery_id"]];
            for (const o of orphans) rows.push([o.userId, o.galleryId]);
            console.log(formatTable(rows));
          }
        }
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
