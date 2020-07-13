const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");

const CONST = require("../utils/constants");
const config = require("../utils/config");
const logger = require("../utils/logger");
const db = require("../db");

const sessions = {};

const decodeSessionToken = (encodedToken) => {
  const token = Buffer.from(encodedToken, "base64").toString("ascii");
  const [username, session] = token.split("=", 2);
  return [username, session];
};

module.exports = () => {
  const checkUserPassword = (credentials) => {
    logger.debug("Check password", credentials);
    return new Promise((resolve, reject) => {
      const verifyPassword = (user) => {
        bcrypt.compare(credentials.password, user.password, (error, result) => {
          if (error || !result) {
            reject(CONST.ERROR_LOGIN);
          } else {
            resolve();
          }
        });
      };

      db.loadUser(credentials.username)
        .then((user) => verifyPassword(user))
        .catch(() => reject(CONST.ERROR_LOGIN));
    });
  };
  const authenticateUser = (credentials) => {
    return new Promise((resolve, reject) => {
      logger.debug("Authenticating user", credentials);
      const createSession = (username) => {
        const tokenContent = { username: credentials.username };
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
      checkUserPassword(credentials)
        .then(() => {
          const token = createSession(credentials.username);
          logger.debug("Current sessions", sessions);
          resolve([
            sessions[credentials.username][token],
            `${credentials.username}=${token}`,
          ]);
        })
        .catch((error) => reject(error));
    });
  };
  const revokeSession = (encodedToken) => {
    return new Promise((resolve) => {
      const [username, session] = decodeSessionToken(encodedToken);
      logger.debug("Revoking session", username, session, encodedToken);
      if (!username || !session) {
        resolve();
        return;
      }

      if (username in sessions && session in sessions[username]) {
        delete sessions[username][session];
      }
      logger.debug("Current sessions", sessions);
      resolve();
    });
  };
  const revokeAllSessionsAdmin = (credentials) => {
    return new Promise((resolve) => {
      logger.debug("Revoking all sessions as admin", credentials);
      if (credentials.username in sessions) {
        delete sessions[credentials.username];
      }
      logger.debug("Current sessions", sessions);
      resolve();
    });
  };
  const revokeAllSessions = (credentials) => {
    return new Promise((resolve, reject) => {
      checkUserPassword(credentials)
        .then(() =>
          revokeAllSessionsAdmin(credentials)
            .then(() => resolve())
            .catch((error) => reject(error))
        )
        .catch((error) => reject(error));
    });
  };
  const verifySession = (encodedToken) => {
    return new Promise((resolve, reject) => {
      const [username, token] = decodeSessionToken(encodedToken);
      logger.debug("Verifying session", username, token, encodedToken);

      if (!(username in sessions) || !(token in sessions[username])) {
        reject(CONST.ERROR_LOGIN);
        return;
      }

      const decodedToken = jwt.verify(token, process.env.SECRET);
      if (!decodedToken || decodedToken.username !== username) {
        reject(CONST.ERROR_LOGIN);
        return;
      }

      const now = new Date();
      if (sessions[username][token].updated < now - CONST.SESSION_LENGTH_MS) {
        reject(CONST.ERROR_SESSION_EXPIRED);
      } else {
        sessions[username][token].updated = now;
        logger.debug("Current sessions", sessions);
        resolve(sessions[username][token]);
      }
    });
  };

  return {
    authenticateUser,
    revokeSession,
    revokeAllSessionsAdmin,
    revokeAllSessions,
    verifySession,
  };
};
