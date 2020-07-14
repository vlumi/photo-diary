const CONST = require("../constants");
const logger = require("../utils/logger");
const db = require("../db");

module.exports = () => {
  const getUsers = async () => {
    logger.debug("Getting all users", "dummy db", db);
    throw CONST.ERROR_NOT_IMPLEMENTED;
  };
  const getUser = async (username) => {
    logger.debug("Getting user", username);
    throw CONST.ERROR_NOT_IMPLEMENTED;
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

  return {
    getUsers,
    getUser,
    createUser,
    updateUser,
    deleteUser,
  };
};
