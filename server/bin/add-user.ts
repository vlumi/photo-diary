#!/usr/bin/env -S npx tsx

import { randomUUID } from "node:crypto";

import bcrypt from "bcrypt";

import yargs from "yargs";
import { hideBin } from "yargs/helpers";

import logger from "../lib/logger.js";
import db from "../db/index.js";

const saltRounds = 10;

const argv = yargs(hideBin(process.argv))
  .alias("l", "list")
  .describe("l", "List users")
  .alias("u", "user")
  .nargs("u", 1)
  .describe("u", "User ID")
  .alias("p", "password")
  .nargs("p", 1)
  .describe("p", "Password")
  .check(function (argv) {
    if (argv.l) {
      return true;
    }
    if (argv.u && argv.p) {
      return true;
    }
    throw new Error("Error: either --list, or user and password is needed");
  })
  // .demandOption(["u", "p"])
  .usage("Usage: $0 [options]")
  .parseSync();

if (argv.l) {
  db.loadUsers().then(async (users) => {
    (users as Array<{ id: string }>)
      .filter((user) => !!user.id)
      .forEach((user) => process.stdout.write(`${user.id}\n`));
  });
} else {
  const userId = argv.u as string;
  const password = argv.p as string;

  bcrypt.hash(password, saltRounds, async (err, hash) => {
    db.loadUser(userId)
      .then(async (user) => {
        const u = user as { id: string };
        db.updateUser(u.id, { password: hash, secret: randomUUID() }).catch(
          (error) => {
            logger.error("Failed:", error);
          }
        );
        logger.info(`Existing user "${userId}" found and updated.`);
      })
      .catch(async () => {
        db.createUser({ id: userId, password: hash, secret: randomUUID() }).catch(
          (error) => {
            logger.error("Failed:", error);
          }
        );
        logger.info(`New user "${userId}" created.`);
      });
  });
}
