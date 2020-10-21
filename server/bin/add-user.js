#!/usr/bin/env node

import bcrypt from "bcrypt";
import { v4 as uuidv4 } from "uuid";

import logger from "../lib/logger.cjs";
import db from "../db/index.cjs";

const saltRounds = 10;

import yargs from "yargs";
const argv = yargs(process.argv)
  .alias("u", "user")
  .nargs("u", 1)
  .describe("u", "User ID")
  .alias("p", "password")
  .nargs("p", 1)
  .describe("p", "Password")
  .demandOption(["u", "p"])
  .usage("Usage: $0 [options]").argv;

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
