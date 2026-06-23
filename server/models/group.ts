import { ConflictError, NotFoundError } from "../lib/errors.js";
import { assertSlugId } from "../lib/id-shape.js";
import logger from "../lib/logger.js";
import db from "../db/index.js";

export default () => {
  return {
    init,
    getGroups,
    getGroup,
    createGroup,
    updateGroup,
    deleteGroup,
    getMembers,
    getUserGroups,
    addMember,
    removeMember,
  };
};

const init = async () => {};

const getGroups = async () => await db.loadGroups();
const getGroup = async (groupId: string) => await db.loadGroup(groupId);
const createGroup = async (group: {
  id: string;
  name?: string;
  description?: string;
}) => {
  assertSlugId(group.id);
  logger.debug("Creating group", { id: group.id });
  try {
    await db.loadGroup(group.id);
    throw new ConflictError(`Group "${group.id}" already exists`);
  } catch (err) {
    if (!(err instanceof NotFoundError)) throw err;
  }
  await db.createGroup({
    id: group.id,
    name: group.name ?? group.id,
    description: group.description ?? "",
  });
};
const updateGroup = async (
  groupId: string,
  patch: { name?: string; description?: string }
) => {
  logger.debug("Updating group", { id: groupId });
  await db.updateGroup(groupId, patch);
};
const deleteGroup = async (groupId: string) => {
  logger.debug("Deleting group", { id: groupId });
  await db.deleteGroup(groupId);
};

const getMembers = async (groupId: string) => await db.loadGroupMembers(groupId);
const getUserGroups = async (userId: string) => await db.loadUserGroups(userId);
const addMember = async (userId: string, groupId: string) => {
  logger.debug("Adding group member", { userId, groupId });
  await db.addUserGroup(userId, groupId);
};
const removeMember = async (userId: string, groupId: string) => {
  logger.debug("Removing group member", { userId, groupId });
  await db.removeUserGroup(userId, groupId);
};
