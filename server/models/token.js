const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const { v4: uuidv4 } = require("uuid");

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
    revokeToken,
    verifyToken,
  };
};

const checkUserPassword = async (credentials, user) => {
  logger.debug("Check password", credentials);
  if (!(await bcrypt.compare(credentials.password, user.password))) {
    throw CONST.ERROR_LOGIN;
  }
};
const authenticateUser = async (credentials) => {
  logger.debug("Authenticating user", credentials);
  const createToken = (id) => {
    const tokenContent = { id: credentials.id };
    // TODO: expiration
    return jwt.sign(tokenContent, secrets[id] || config.SECRET);
  };
  try {
    const user = await db.loadUser(credentials.id);
    await checkUserPassword(credentials, user);

    const token = createToken(credentials.id);
    return `${credentials.id}=${token}`;
  } catch (error) {
    throw CONST.ERROR_LOGIN;
  }
};
const revokeToken = async (id) => {
  logger.debug("Revoking token for user:", id);
  if (!id) {
    return;
  }
  secrets[id] = uuidv4();
};
const verifyToken = async (encodedToken) => {
  const [id, token] = decodeToken(encodedToken);
  logger.debug("Verifying token", id, token, encodedToken);

  const user = jwt.verify(token, secrets[id] || config.SECRET);
  if (!user || user.id !== id) {
    throw CONST.ERROR_LOGIN;
  }
  return user;
};

const decodeToken = (encodedToken) =>
  Buffer.from(encodedToken, "base64").toString("ascii").split("=", 2);
