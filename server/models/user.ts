/* eslint-disable @typescript-eslint/no-explicit-any */
import { randomBytes } from "node:crypto";
import bcrypt from "bcrypt";

import { NotImplementedError, ValidationError } from "../lib/errors.js";
import logger from "../lib/logger.js";
import db from "../db/index.js";

export default () => {
  return {
    init,
    getUsers,
    getUser,
    createUser,
    updateUser,
    deleteUser,
    changePassword,
  };
};

const init = async () => {};

const getUsers = async () => {
  return await db.loadUsers();
};
const getUser = async (id: string) => {
  return await db.loadUser(id);
};
const createUser = async (user: Record<string, any>) => {
  logger.debug("Creating user", user);
  throw new NotImplementedError();
};
const updateUser = async (user: Record<string, any>) => {
  logger.debug("Updating user", user);
  throw new NotImplementedError();
};
const deleteUser = async (id: string) => {
  logger.debug("Deleting user", id);
  throw new NotImplementedError();
};

// Self-service password change. Verifies the current password (so a stolen
// session can't be used to lock the real owner out — the attacker would
// still need to know the original password), writes the new bcrypt hash,
// and rotates the user's `secret` so every other outstanding JWT for this
// user is immediately invalidated. The 10-round cost factor matches
// `bin/user.ts passwd`. Returns the new secret so the caller can mint a
// fresh JWT for the current session without forcing an immediate re-login.
const changePassword = async (
  userId: string,
  currentPassword: string,
  newPassword: string
): Promise<{ newSecret: string }> => {
  logger.debug(`Changing password for "${userId}"`);
  const user = (await db.loadUser(userId)) as {
    id: string;
    password: string;
    secret: string;
  };
  const match = await bcrypt.compare(currentPassword, user.password);
  if (!match) {
    logger.debug(`Current password mismatch for "${userId}"`);
    // 422 (not 401) — the bearer token is still valid, the user IS
    // authenticated, the *body* is what's wrong. Returning 401 here would
    // trip the SPA's global session-expired handler and kick the user out
    // of their otherwise-fine session.
    throw new ValidationError("Current password is incorrect");
  }
  const newHash = await bcrypt.hash(newPassword, 10);
  const newSecret = randomBytes(32).toString("hex");
  await db.updateUser(userId, { password: newHash, secret: newSecret });
  logger.debug(`Password rotated for "${userId}"`);
  return { newSecret };
};
