const CONST = require("../lib/constants");
const logger = require("../lib/logger");
const db = require("../db");

module.exports = () => {
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
const getUser = async (id) => {
  return await db.loadUser(id);
};
const createUser = async (user) => {
  logger.debug("Creating user", user);
  throw CONST.ERROR_NOT_IMPLEMENTED;
};
const updateUser = async (user) => {
  logger.debug("Updating user", user);
  throw CONST.ERROR_NOT_IMPLEMENTED;
};
const deleteUser = async (id) => {
  logger.debug("Deleting user", id);
  throw CONST.ERROR_NOT_IMPLEMENTED;
};
