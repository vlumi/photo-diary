#!/usr/bin/env -S npx tsx
/* eslint-disable no-console -- interactive CLI tool; console output is the UI */

/**
 * Manage user groups and everything granted to a group.
 *
 * Identity:
 *   group.ts list                          # every group
 *   group.ts show <id>                     # one group with member list
 *   group.ts create <id> [--title …] [--description …]
 *   group.ts update <id> [--title …] [--description …]
 *   group.ts delete <id>                   # FK cascade clears members + grants
 *
 * Members:
 *   group.ts members <id>                  # list members of a group
 *   group.ts add <user> <group>            # add user to group
 *   group.ts remove <user> <group>         # remove user from group
 *
 * Access (group_gallery):
 *   group.ts grant <group> <gallery> [--admin]
 *   group.ts revoke <group> <gallery> [--yes]
 *   group.ts hide-map <group> <gallery> <hide|show|default>
 *   group.ts grants [<group>]              # direct group_gallery rows
 *   group.ts access [<group>]              # same as grants — groups have no inheritance, kept for symmetry
 *
 *   group.ts audit                         # orphan memberships / orphan
 *                                          # group_gallery rows
 *
 * User-side ACL lives in `bin/user.ts`; gallery-side slice in
 * `bin/gallery.ts access <gallery>`.
 */

import { createInterface } from "node:readline/promises";

import yargs from "yargs";
import { hideBin } from "yargs/helpers";

import db from "../db/index.js";

const REJECTED_GALLERY_IDS = new Set([":all", ":public"]);
const requireRealGalleryId = (galleryId: string) => {
  if (REJECTED_GALLERY_IDS.has(galleryId)) {
    console.error(`✗ ${galleryId} is not a real gallery.`);
    process.exit(1);
  }
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

const accessLabel = (isAdmin: number | boolean): string =>
  isAdmin ? "admin" : "view";
const hideMapLabel = (value: number | null): string => {
  if (value === null) return "—";
  return value === 1 ? "hide" : "show";
};

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

const checkGroupId = (id: string) => {
  if (id.startsWith(":")) {
    console.error(
      `✗ "${id}" starts with ':' — that's the sigil prefix reserved for user ids (e.g. :guest). Pick another group id.`
    );
    process.exit(1);
  }
};

await yargs(hideBin(process.argv))
  .scriptName("group.ts")
  .locale("en")
  .strict()
  .demandCommand(
    1,
    "Specify a subcommand: list, show, create, update, delete, members, add, remove, grant, revoke, hide-map, grants, access, audit"
  )
  .command(
    "list",
    "Print every group as a table",
    (y) => y,
    async () => {
      const groups = (await db.loadGroups()) as Array<{
        id: string;
        title: string;
        description: string;
      }>;
      const rows: string[][] = [["id", "title", "description"]];
      for (const g of groups) rows.push([g.id, g.title, g.description]);
      console.log(rows.length === 1 ? "(no groups)" : formatTable(rows));
    }
  )
  .command(
    "show <id>",
    "Print one group with its member list",
    (y) =>
      y.positional("id", { describe: "Group ID", type: "string", demandOption: true }),
    async (argv) => {
      const group = (await db
        .loadGroup(argv.id)
        .catch(() => null)) as { id: string; title: string; description: string } | null;
      if (!group) {
        console.error(`✗ Group "${argv.id}" doesn't exist.`);
        process.exit(1);
      }
      const members = await db.loadGroupMembers(argv.id);
      console.log(`id:          ${group.id}`);
      console.log(`title:       ${group.title}`);
      console.log(`description: ${group.description}`);
      console.log(`members:     ${members.length === 0 ? "(none)" : members.join(", ")}`);
    }
  )
  .command(
    "create <id>",
    "Create a new group (fails if id already exists)",
    (y) =>
      y
        .positional("id", { describe: "Group ID", type: "string", demandOption: true })
        .option("title", { describe: "Display title", type: "string" })
        .option("description", { describe: "Long description", type: "string" }),
    async (argv) => {
      checkGroupId(argv.id);
      const existing = await db.loadGroup(argv.id).catch(() => null);
      if (existing) {
        console.error(`✗ Group "${argv.id}" already exists. Use \`update\` to modify it.`);
        process.exit(1);
      }
      await db.createGroup({
        id: argv.id,
        title: argv.title ?? "",
        description: argv.description ?? "",
      });
      console.log(`✓ Created group "${argv.id}".`);
    }
  )
  .command(
    "update <id>",
    "Update an existing group (fails if id is missing)",
    (y) =>
      y
        .positional("id", { describe: "Group ID", type: "string", demandOption: true })
        .option("title", { describe: "Display title", type: "string" })
        .option("description", { describe: "Long description", type: "string" }),
    async (argv) => {
      const existing = await db.loadGroup(argv.id).catch(() => null);
      if (!existing) {
        console.error(`✗ Group "${argv.id}" doesn't exist. Use \`create\` first.`);
        process.exit(1);
      }
      const patch: { title?: string; description?: string } = {};
      if ("title" in argv) patch.title = argv.title as string;
      if ("description" in argv) patch.description = argv.description as string;
      await db.updateGroup(argv.id, patch);
      console.log(`✓ Updated group "${argv.id}".`);
    }
  )
  .command(
    "delete <id>",
    "Delete a group (FK cascade clears its user_group + group_gallery rows)",
    (y) =>
      y.positional("id", { describe: "Group ID", type: "string", demandOption: true }),
    async (argv) => {
      const existing = await db.loadGroup(argv.id).catch(() => null);
      if (!existing) {
        console.error(`✗ Group "${argv.id}" doesn't exist.`);
        process.exit(1);
      }
      await db.deleteGroup(argv.id);
      console.log(`✓ Deleted group "${argv.id}".`);
    }
  )
  .command(
    "members <id>",
    "List user ids that are members of the group",
    (y) =>
      y.positional("id", { describe: "Group ID", type: "string", demandOption: true }),
    async (argv) => {
      const members = await db.loadGroupMembers(argv.id);
      if (members.length === 0) {
        console.log("(no members)");
      } else {
        for (const m of members) console.log(m);
      }
    }
  )
  .command(
    "add <user> <group>",
    "Add a user to a group (idempotent)",
    (y) =>
      y
        .positional("user", { describe: "User ID", type: "string", demandOption: true })
        .positional("group", { describe: "Group ID", type: "string", demandOption: true }),
    async (argv) => {
      await db.addUserGroup(argv.user, argv.group);
      console.log(`✓ Added ${argv.user} → ${argv.group}.`);
    }
  )
  .command(
    "remove <user> <group>",
    "Remove a user from a group",
    (y) =>
      y
        .positional("user", { describe: "User ID", type: "string", demandOption: true })
        .positional("group", { describe: "Group ID", type: "string", demandOption: true }),
    async (argv) => {
      await db.removeUserGroup(argv.user, argv.group);
      console.log(`✓ Removed ${argv.user} from ${argv.group}.`);
    }
  )
  .command(
    "grant <group> <gallery>",
    "Grant a group view (or admin with --admin) on a gallery. Idempotent — re-running with a different --admin toggles it.",
    (y) =>
      y
        .positional("group", { describe: "Group ID", type: "string", demandOption: true })
        .positional("gallery", { describe: "Gallery ID", type: "string", demandOption: true })
        .option("admin", { describe: "Grant gallery-admin instead of view", type: "boolean", default: false }),
    async (argv) => {
      requireRealGalleryId(argv.gallery);
      await db.upsertGroupGallery({
        group_id: argv.group,
        gallery_id: argv.gallery,
        is_admin: !!argv.admin,
      });
      console.log(
        `✓ Granted ${argv.admin ? "admin" : "view"} to group (${argv.group}, ${argv.gallery})`
      );
    }
  )
  .command(
    "revoke <group> <gallery>",
    "Delete the group_gallery row (revokes all access at this scope)",
    (y) =>
      y
        .positional("group", { describe: "Group ID", type: "string", demandOption: true })
        .positional("gallery", { describe: "Gallery ID", type: "string", demandOption: true })
        .option("yes", { describe: "Skip the confirmation prompt", type: "boolean", default: false }),
    async (argv) => {
      requireRealGalleryId(argv.gallery);
      if (!argv.yes) {
        const ok = await confirm(`Revoke group (${argv.group}, ${argv.gallery})?`);
        if (!ok) {
          console.log("Aborted.");
          return;
        }
      }
      await db.deleteGroupGallery(argv.group, argv.gallery);
      console.log(`✓ Revoked group (${argv.group}, ${argv.gallery})`);
    }
  )
  .command(
    "hide-map <group> <gallery> <state>",
    "Set the map privacy toggle for a group × gallery pair",
    (y) =>
      y
        .positional("group", { describe: "Group ID", type: "string", demandOption: true })
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
      await db.upsertGroupGallery({
        group_id: argv.group,
        gallery_id: argv.gallery,
        hide_map: value,
      });
      const label = value === 1 ? "hide" : value === 0 ? "show" : "default (cleared)";
      console.log(`✓ hide_map set to ${label} for group (${argv.group}, ${argv.gallery})`);
    }
  )
  .command(
    "grants [group]",
    "Print direct group_gallery rows (optionally filtered to one group)",
    (y) =>
      y
        .positional("group", { describe: "Group ID", type: "string" })
        .option("gallery", { describe: "Filter to one gallery ID", type: "string" }),
    async (argv) => {
      const rows = await db.loadGroupGalleryRows({
        groupId: argv.group,
        galleryId: argv.gallery,
      });
      if (rows.length === 0) {
        console.log("(no rows)");
        return;
      }
      const lines: string[][] = [["group", "gallery", "access", "hide_map"]];
      for (const r of rows) {
        lines.push([
          r.group_id,
          r.gallery_id,
          accessLabel(r.is_admin),
          hideMapLabel(r.hide_map),
        ]);
      }
      console.log(formatTable(lines));
    }
  )
  .command(
    "access [group]",
    "Print effective access for a group. Groups don't inherit, so this is the same as `grants` — kept for symmetry with bin/user.ts and bin/gallery.ts.",
    (y) => y.positional("group", { describe: "Group ID", type: "string" }),
    async (argv) => {
      const rows = await db.loadGroupGalleryRows({ groupId: argv.group });
      if (rows.length === 0) {
        console.log("(no rows)");
        return;
      }
      const lines: string[][] = [["group", "gallery", "access", "hide_map"]];
      for (const r of rows) {
        lines.push([
          r.group_id,
          r.gallery_id,
          accessLabel(r.is_admin),
          hideMapLabel(r.hide_map),
        ]);
      }
      console.log(formatTable(lines));
    }
  )
  .command(
    "audit",
    "Find user_group / group_gallery rows whose referenced user or group no longer exists",
    (y) => y,
    async () => {
      const users = (await db.loadUsers()) as Array<{ id: string }>;
      const groups = (await db.loadGroups()) as Array<{ id: string }>;
      const userIds = new Set(users.map((u) => u.id));
      const groupIds = new Set(groups.map((g) => g.id));
      // Walk every group's membership list, flagging dangling refs.
      // FKs ON DELETE CASCADE should keep this clean — surfacing rows
      // just in case manual SQL ever bypasses the cascade.
      const orphanUsers: Array<[string, string]> = [];
      const orphanGroups: Array<[string, string]> = [];
      for (const g of groups) {
        const ms = await db.loadGroupMembers(g.id);
        for (const u of ms) {
          if (!userIds.has(u)) orphanUsers.push([u, g.id]);
        }
      }
      // Walk every user's group list for missing groups.
      for (const u of users) {
        const gs = await db.loadUserGroups(u.id);
        for (const g of gs) {
          if (!groupIds.has(g)) orphanGroups.push([u.id, g]);
        }
      }
      // group_gallery rows whose group_id no longer exists.
      const grantRows = await db.loadGroupGalleryRows({});
      const orphanGrantGroups = grantRows.filter(
        (r) => !groupIds.has(r.group_id)
      );
      console.log(
        `Audited ${groups.length} group(s) across ${users.length} user(s).`
      );
      if (orphanUsers.length > 0) {
        console.log(`\nMemberships pointing at a missing user: ${orphanUsers.length}`);
        for (const [u, g] of orphanUsers) console.log(`  ${u} → ${g}`);
      }
      if (orphanGroups.length > 0) {
        console.log(`\nMemberships pointing at a missing group: ${orphanGroups.length}`);
        for (const [u, g] of orphanGroups) console.log(`  ${u} → ${g}`);
      }
      if (orphanGrantGroups.length > 0) {
        console.log(
          `\ngroup_gallery rows for a missing group: ${orphanGrantGroups.length}`
        );
        for (const r of orphanGrantGroups)
          console.log(`  ${r.group_id} → ${r.gallery_id}`);
      }
    }
  )
  .parseAsync();
