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
  users.forEach((user) => (secrets[user.username] = user.secret));
  logger.debug("Loading secrets done");
};

const init = async () => {
  await loadSecrets();
};

module.exports = () => {
  return {
    init,
    authenticateUser,
    revokeSession,
    verifySession,
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
  const createSession = (username) => {
    const tokenContent = { username: credentials.username };
    // TODO: expiration
    return jwt.sign(tokenContent, secrets[username] || config.SECRET);
  };
  try {
    const user = await db.loadUser(credentials.username);
    await checkUserPassword(credentials, user);

    const token = createSession(credentials.username);
    return `${credentials.username}=${token}`;
  } catch (error) {
    throw CONST.ERROR_LOGIN;
  }
};
const revokeSession = async (username) => {
  logger.debug("Revoking session for user:", username);
  if (!username) {
    return;
  }
  secrets[username] = uuidv4();
};
const verifySession = async (encodedToken) => {
  const [username, token] = decodeSessionToken(encodedToken);
  logger.debug("Verifying session", username, token, encodedToken);

  const decodedToken = jwt.verify(token, secrets[username] || config.SECRET);
  if (!decodedToken || decodedToken.username !== username) {
    throw CONST.ERROR_LOGIN;
  }
  return decodedToken;
};

const decodeSessionToken = (encodedToken) => {
  const token = Buffer.from(encodedToken, "base64").toString("ascii");
  const [username, session] = token.split("=", 2);
  return [username, session];
};
