const { v4: uuidv4 } = require("uuid");
const bcrypt = require("bcrypt");

const CONST = require("../utils/constants");
const logger = require("../utils/logger");
const db = require("../db");

// TODO: DB?
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
        const token = uuidv4();
        // TODO: DB
        sessions[username] = sessions[username] || {};
        const now = new Date();
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
          // TODO: DB
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
        // TODO: DB
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
        // TODO: DB
        delete sessions[credentials.username];
      }
      logger.debug("Current sessions", sessions);
      resolve();
    });
  };
  const revokeAllSessions = (credentials) => {
    return new Promise((resolve, reject) => {
      logger.debug("Revoking all sessions", credentials);
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
      const [username, session] = decodeSessionToken(encodedToken);
      logger.debug("Verifying session", username, session, encodedToken);
      // TODO: DB
      if (!(username in sessions) || !(session in sessions[username])) {
        reject(CONST.ERROR_LOGIN);
        return;
      }
      const now = new Date();
      if (sessions[username][session].updated < now - CONST.SESSION_LENGTH_MS) {
        reject(CONST.ERROR_SESSION_EXPIRED);
      } else {
        sessions[username][session].updated = now;
        logger.debug("Current sessions", sessions);
        resolve(sessions[username][session]);
      }
    });
  };

  return {
    authenticateUser,
    revokeSession,
    revokeAllSessions,
    verifySession,
  };
};