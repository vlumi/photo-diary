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

// Verifies the current password so a stolen session can't lock the real
// owner out, then rotates `secret` to invalidate every other outstanding JWT.
// Returns the new secret so the caller can re-sign the current session.
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
    // 422 not 401: the session is fine, the body is what's wrong. A 401
    // would trip the SPA's session-expired handler and force re-login.
    throw new ValidationError("Current password is incorrect");
  }
  const newHash = await bcrypt.hash(newPassword, 10);
  const newSecret = randomBytes(32).toString("hex");
  await db.updateUser(userId, { password: newHash, secret: newSecret });
  logger.debug(`Password rotated for "${userId}"`);
  return { newSecret };
};
