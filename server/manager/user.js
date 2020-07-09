const CONST = require("../constants");

module.exports = (db) => {
  const getUsers = (onSuccess, onError) => {
    console.log(`Dummy message to use variable ${db}`);
    onError(CONST.ERROR_NOT_IMPLEMENTED);
  };
  const getUser = (username, onSuccess, onError) => {
    onError(CONST.ERROR_NOT_IMPLEMENTED);
  };
  const createUser = (user, onSuccess, onError) => {
    onError(CONST.ERROR_NOT_IMPLEMENTED);
  };
  const updateUser = (user, onSuccess, onError) => {
    onError(CONST.ERROR_NOT_IMPLEMENTED);
  };
  const deleteUser = (username, onSuccess, onError) => {
    onError(CONST.ERROR_NOT_IMPLEMENTED);
  };

  return {
    getUsers,
    getUser,
    createUser,
    updateUser,
    deleteUser,
  };
};
