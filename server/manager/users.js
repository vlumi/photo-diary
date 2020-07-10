const CONST = require("../constants");
const logger = require("../utils/logger");
const db = require("../db");

module.exports = () => {
  const getUsers = () => {
    return new Promise((resolve, reject) => {
      logger.debug("Getting all users", "dummy db", db);
      reject(CONST.ERROR_NOT_IMPLEMENTED);
    });
  };
  const getUser = (username) => {
    logger.debug("Getting user", username);
    return new Promise((resolve, reject) => {
      reject(CONST.ERROR_NOT_IMPLEMENTED);
    });
  };
  const createUser = (user) => {
    logger.debug("Creating user", user);
    return new Promise((resolve, reject) => {
      reject(CONST.ERROR_NOT_IMPLEMENTED);
    });
  };
  const updateUser = (user) => {
    logger.debug("Updating user", user);
    return new Promise((resolve, reject) => {
      reject(CONST.ERROR_NOT_IMPLEMENTED);
    });
  };
  const deleteUser = (username) => {
    logger.debug("Deleting user", username);
    return new Promise((resolve, reject) => {
      reject(CONST.ERROR_NOT_IMPLEMENTED);
    });
  };

  return {
    getUsers,
    getUser,
    createUser,
    updateUser,
    deleteUser,
  };
};
