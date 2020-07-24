#!/usr/bin/env node

const bcrypt = require("bcrypt");
const { v4: uuidv4 } = require("uuid");

const logger = require("../utils/logger");
const db = require("../db");

const saltRounds = 10;

const { argv } = require("yargs")
  .alias("u", "user")
  .nargs("u", 1)
  .describe("u", "User ID")
  .alias("p", "password")
  .nargs("p", 1)
  .describe("p", "Password")
  .demandOption(["u", "p"])
  .usage("Usage: $0 [options]");

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
