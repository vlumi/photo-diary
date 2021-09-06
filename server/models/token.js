import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

import CONST from "../lib/constants.cjs";
import config from "../lib/config/index.cjs";
import logger from "../lib/logger.cjs";
import db from "../db/index.js";

const secrets = {};

const loadSecrets = async () => {
  logger.debug("Loading secrets");
  const users = await db.loadUsers();
  users.forEach((user) => (secrets[user.id] = user.secret));
  logger.debug("Loading secrets done");
};

const getSecret = (userId) => {
  if (!(userId in secrets)) {
    return config.SECRET;
  }
  return `${secrets[userId]}${config.SECRET}`;
};

const init = async () => {
  await loadSecrets();
  // Reload every minute or so
  setTimeout(async () => await init(), 60000);
};

export default () => {
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
  return await jwt.sign(tokenContent, getSecret(id));
};
const authenticateUser = async (credentials) => {
  logger.debug("Authenticating user", credentials);
  try {
    const user = await db.loadUser(credentials.id);
    await checkUserPassword(credentials, user);
    // Make sure the secret is up-to-date
    secrets[user.id] = user.secret;
  } catch (error) {
    throw CONST.ERROR_LOGIN;
  }
};
const verifyToken = async (token) => {
  const decoded = jwt.decode(token);
  logger.debug("Verifying token", token, secrets[decoded.id]);

  const user = jwt.verify(token, getSecret(decoded.id));
  if (!user || user.id !== decoded.id) {
    throw CONST.ERROR_LOGIN;
  }
  return user;
};
