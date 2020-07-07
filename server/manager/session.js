const CONST = require("../constants");

const { v4: uuidv4 } = require("uuid");
const bcrypt = require("bcrypt");

// TODO: DB
const sessions = {};

const decodeSessionToken = (encodedToken) => {
  const token = Buffer.from(encodedToken, "base64").toString("ascii");
  const [username, session] = token.split("=", 2);
  return [username, session];
};

module.exports = (db) => {
  const checkUserPassword = (credentials) => {
    if (CONST.DEBUG) console.log("Check password", credentials);
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

      db.loadUser(
        credentials.username,
        (user) => verifyPassword(user),
        (error) => reject(CONST.ERROR_LOGIN)
      );
    });
  };
  const authenticateUser = (credentials) => {
    if (CONST.DEBUG) console.log("Login", credentials);
    return new Promise((resolve, reject) => {
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
      const handleSuccess = () => {
        const token = createSession(credentials.username);
        // TODO: DB
        if (CONST.DEBUG) console.log(sessions);
        resolve([
          sessions[credentials.username][token],
          `${credentials.username}=${token}`,
        ]);
      };
      checkUserPassword(credentials)
        .then(() => {
          const token = createSession(credentials.username);
          // TODO: DB
          if (CONST.DEBUG) console.log(sessions);
          resolve([
            sessions[credentials.username][token],
            `${credentials.username}=${token}`,
          ]);
        })
        .catch((error) => reject(error));
    });
  };
  const revokeSession = (encodedToken) => {
    return new Promise((resolve, reject) => {
      const [username, session] = decodeSessionToken(encodedToken);
      if (!username || !session) {
        resolve();
        return;
      }

      if (username in sessions && session in sessions[username]) {
        // TODO: DB
        delete sessions[username][session];
      }
      if (CONST.DEBUG) console.log(sessions);
      resolve();
    });
  };
  const revokeAllSessionsAdmin = (credentials) => {
    return new Promise((resolve, reject) => {
      if (credentials.username in sessions) {
        // TODO: DB
        delete sessions[credentials.username];
      }
      if (CONST.DEBUG) console.log(sessions);
      resolve();
    });
  };
  const revokeAllSessions = (credentials) => {
    return new Promise((resolve, reject) => {
      checkUserPassword(credentials)
        .then(() => revokeAllSessionsAdmin())
        .catch((error) => reject(error));
    });
  };
  const verifySession = (encodedToken) => {
    return new Promise((resolve, reject) => {
      const [username, session] = decodeSessionToken(encodedToken);
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
        if (CONST.DEBUG) console.log(sessions);
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
