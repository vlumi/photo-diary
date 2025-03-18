#!/usr/bin/env node

const bcrypt = require("bcrypt");
const { v4: uuidv4 } = require("uuid");

const logger = require("../lib/logger");
const db = require("../db");

const saltRounds = 10;

const { argv } = require("yargs")
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
  .usage("Usage: $0 [options]");

if (argv.l) {
  db.loadUsers().then(async (users) => {
    users
      .filter((user) => !!user.id)
      .forEach((user) => process.stdout.write(`${user.id}\n`));
  });
} else {
  const userId = argv.u;
  const password = argv.p;

  bcrypt.hash(password, saltRounds, async (err, hash) => {
    db.loadUser(userId)
      .then(async (user) => {
        db.updateUser(user.id, { password: hash, secret: uuidv4() }).catch(
          (error) => {
            logger.error("Failed:", error);
          }
        );
        logger.info(`Existing user "${userId}" found and updated.`);
      })
      .catch(async () => {
        db.createUser({ id: userId, password: hash, secret: uuidv4() }).catch(
          (error) => {
            logger.error("Failed:", error);
          }
        );
        logger.info(`New user "${userId}" created.`);
      });
  });
}
