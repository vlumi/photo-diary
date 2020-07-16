const CONST = require("../utils/constants");
const logger = require("../utils/logger");
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
const getUser = async (username) => {
  return await db.loadUser(username);
};
const createUser = async (user) => {
  logger.debug("Creating user", user);
  throw CONST.ERROR_NOT_IMPLEMENTED;
};
const updateUser = async (user) => {
  logger.debug("Updating user", user);
  throw CONST.ERROR_NOT_IMPLEMENTED;
};
const deleteUser = async (username) => {
  logger.debug("Deleting user", username);
  throw CONST.ERROR_NOT_IMPLEMENTED;
};
