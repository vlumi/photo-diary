const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");

const CONST = require("../utils/constants");
const config = require("../utils/config");
const logger = require("../utils/logger");
const db = require("../db");

// TODO: clean-up expired tokens
const sessions = {};

module.exports = () => {
  return {
    authenticateUser,
    revokeSession,
    revokeAllSessionsAdmin,
    revokeAllSessions,
    verifySession,
  };
};

const checkUserPassword = async (credentials) => {
  logger.debug("Check password", credentials);
  try {
    const user = await db.loadUser(credentials.username);
    if (!(await bcrypt.compare(credentials.password, user.password))) {
      throw CONST.ERROR_LOGIN;
    }
  } catch (error) {
    throw CONST.ERROR_LOGIN;
  }
};
const authenticateUser = async (credentials) => {
  logger.debug("Authenticating user", credentials);
  const createSession = (username) => {
    const tokenContent = { username: credentials.username };
    // TODO: expiration
    const token = jwt.sign(tokenContent, config.SECRET);
    const now = new Date();

    sessions[username] = sessions[username] || {};
    sessions[username][token] = {
      username,
      created: now,
      updated: now,
    };
    return token;
  };
  await checkUserPassword(credentials);
  const token = createSession(credentials.username);
  logger.debug("Current sessions", sessions);
  return [
    sessions[credentials.username][token],
    `${credentials.username}=${token}`,
  ];
};
const revokeSession = async (encodedToken) => {
  const [username, session] = decodeSessionToken(encodedToken);
  logger.debug("Revoking session", username, session, encodedToken);
  if (!username || !session) {
    return;
  }

  if (username in sessions && session in sessions[username]) {
    delete sessions[username][session];
  }
  logger.debug("Current sessions", sessions);
};
const revokeAllSessionsAdmin = async (credentials) => {
  logger.debug("Revoking all sessions as admin", credentials);
  if (credentials.username in sessions) {
    delete sessions[credentials.username];
  }
  logger.debug("Current sessions", sessions);
};
const revokeAllSessions = async (credentials) => {
  await checkUserPassword(credentials);
  await revokeAllSessionsAdmin(credentials);
};
const verifySession = async (encodedToken) => {
  const [username, token] = decodeSessionToken(encodedToken);
  logger.debug("Verifying session", username, token, encodedToken);
  // const user = await db.loadUser(credentials.username);

  if (!(username in sessions) || !(token in sessions[username])) {
    throw CONST.ERROR_LOGIN;
  }

  const decodedToken = jwt.verify(token, process.env.SECRET);
  if (!decodedToken || decodedToken.username !== username) {
    throw CONST.ERROR_LOGIN;
  }

  const now = new Date();
  if (sessions[username][token].updated < now - CONST.SESSION_LENGTH_MS) {
    throw CONST.ERROR_SESSION_EXPIRED;
  }
  sessions[username][token].updated = now;
  logger.debug("Current sessions", sessions);
  return sessions[username][token];
};

const decodeSessionToken = (encodedToken) => {
  const token = Buffer.from(encodedToken, "base64").toString("ascii");
  const [username, session] = token.split("=", 2);
  return [username, session];
};
