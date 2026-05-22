/* eslint-disable @typescript-eslint/no-explicit-any */
import { NotImplementedError } from "../lib/errors.js";
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
