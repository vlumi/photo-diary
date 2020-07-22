const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");

const CONST = require("../utils/constants");
const config = require("../utils/config");
const logger = require("../utils/logger");
const db = require("../db");

const secrets = {};

const loadSecrets = async () => {
  logger.debug("Loading secrets");
  const users = await db.loadUsers();
  users.forEach((user) => (secrets[user.id] = user.secret));
  logger.debug("Loading secrets done");
};

const init = async () => {
  await loadSecrets();
};

module.exports = () => {
  return {
    init,
    authenticateUser,
    createToken,
    verifyToken,
  };
};

const checkUserPassword = async (credentials, user) => {
  logger.debug("Check password", credentials, user);
  return new Promise((resolve, reject) => {
    bcrypt.compare(credentials.password, user.password, (error, result) => {
      if (error || !result) {
        logger.debug("Invalid password", credentials);
        reject(CONST.ERROR_LOGIN);
      }
      logger.debug("success!", error, result);
      resolve();
    });
  });
};
const createToken = async (id, isAdmin) => {
  const tokenContent = { id, isAdmin };
  // TODO: expiration
  return await jwt.sign(tokenContent, secrets[id] || config.SECRET);
};
const authenticateUser = async (credentials) => {
  logger.debug("Authenticating user", credentials);
  try {
    const user = await db.loadUser(credentials.id);
    await checkUserPassword(credentials, user);
  } catch (error) {
    throw CONST.ERROR_LOGIN;
  }
};
const verifyToken = async (token) => {
  const decoded = jwt.decode(token);
  logger.debug("Verifying token", token, secrets[decoded.id]);

  const user = jwt.verify(token, secrets[decoded.id] || config.SECRET);
  if (!user || user.id !== decoded.id) {
    throw CONST.ERROR_LOGIN;
  }
  return user;
};
