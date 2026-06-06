import { randomBytes, randomUUID } from "node:crypto";
import bcrypt from "bcrypt";

import { SALT_ROUNDS } from "../lib/bcrypt-rounds.js";
import { ValidationError } from "../lib/errors.js";
import { assertSlugId } from "../lib/id-shape.js";
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
const createUser = async (user: {
  id: string;
  name?: string;
  password: string;
  isAdmin?: boolean;
}) => {
  assertSlugId(user.id);
  logger.debug("Creating user", { id: user.id, isAdmin: !!user.isAdmin });
  const password = await bcrypt.hash(user.password, SALT_ROUNDS);
  await db.createUser({
    id: user.id,
    name: user.name ?? user.id,
    password,
    secret: randomUUID(),
    is_admin: user.isAdmin ? 1 : 0,
  });
};
// Admin-driven user update. Password rotation invalidates `secret`
// (and active sessions) — same semantics as `bin/user.ts passwd`.
// Toggling `isAdmin` is a separate concern that doesn't rotate the
// secret; only password change does.
const updateUser = async (
  userId: string,
  patch: { name?: string; password?: string; isAdmin?: boolean }
) => {
  logger.debug("Updating user", { id: userId, hasPassword: !!patch.password });
  const update: Record<string, unknown> = {};
  if (patch.name !== undefined) {
    update.name = patch.name;
  }
  if (patch.password) {
    update.password = await bcrypt.hash(patch.password, SALT_ROUNDS);
    update.secret = randomBytes(32).toString("hex");
  }
  if (patch.isAdmin !== undefined) {
    update.is_admin = patch.isAdmin ? 1 : 0;
  }
  if (Object.keys(update).length === 0) return;
  await db.updateUser(userId, update);
  if (update.password) await db.deleteUserSessions(userId);
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
