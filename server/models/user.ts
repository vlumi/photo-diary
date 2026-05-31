import { randomBytes, randomUUID } from "node:crypto";
import bcrypt from "bcrypt";

import { SALT_ROUNDS } from "../lib/bcrypt-rounds.js";
import { ValidationError } from "../lib/errors.js";
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
const createUser = async (user: { id: string; password: string }) => {
  logger.debug("Creating user", { id: user.id });
  const password = await bcrypt.hash(user.password, SALT_ROUNDS);
  await db.createUser({ id: user.id, password, secret: randomUUID() });
};
// Admin-driven password reset for another user. Rotates `secret` so
// any existing JWTs (and the user's own active sessions) are
// invalidated — same semantics as `bin/user.ts passwd` without
// `--keep-secret`.
const updateUser = async (userId: string, patch: { password: string }) => {
  logger.debug("Updating user", { id: userId });
  const password = await bcrypt.hash(patch.password, SALT_ROUNDS);
  const secret = randomBytes(32).toString("hex");
  await db.updateUser(userId, { password, secret });
  await db.deleteUserSessions(userId);
};
// Cascades to user_gallery rows so we don't orphan ACL entries.
// Matches the `bin/user.ts delete` cleanup.
const deleteUser = async (id: string) => {
  logger.debug("Deleting user", id);
  const accessRows = (await db.loadUserGalleryRows({ userId: id })) as Array<{
    user_id: string;
    gallery_id: string;
  }>;
  for (const row of accessRows) {
    await db.deleteUserGallery(row.user_id, row.gallery_id);
  }
  await db.deleteUserSessions(id);
  await db.deleteUser(id);
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
  const newHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  const newSecret = randomBytes(32).toString("hex");
  await db.updateUser(userId, { password: newHash, secret: newSecret });
  logger.debug(`Password rotated for "${userId}"`);
  return { newSecret };
};
