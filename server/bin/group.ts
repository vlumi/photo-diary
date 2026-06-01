#!/usr/bin/env -S npx tsx
/* eslint-disable no-console -- interactive CLI tool; console output is the UI */

/**
 * Manage user groups (post-#270). Subcommands:
 *
 *   group.ts list
 *   group.ts show <id>
 *   group.ts create <id> [--title …] [--description …]
 *   group.ts update <id> [--title …] [--description …]
 *   group.ts delete <id>
 *   group.ts members <id>                  # list members of a group
 *   group.ts add <user> <group>            # add user to group
 *   group.ts remove <user> <group>         # remove user from group
 *   group.ts audit
 *
 * Per-gallery group grants live in `bin/access.ts grant --group …` /
 * `access.ts revoke --group …` — same tool, same verbs.
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
    "Specify a subcommand: list, show, create, update, delete, members, add, remove, audit"
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
    "audit",
    "Find user_group rows whose referenced user or group no longer exists",
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
    }
  )
  .parseAsync();
