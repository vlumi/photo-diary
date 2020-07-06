const CONST = require("../constants");

const { v4: uuidv4 } = require("uuid");
const bcrypt = require("bcrypt");

// TODO: DB
const sessions = {};

module.exports = (db) => {
  const checkUserPassword = (credentials, onSuccess, onError) => {
    const verifyPassword = (user) =>
      bcrypt.compare(credentials.password, user.password, (error, result) => {
        if (error || !result) {
          onError(CONST.ERROR_LOGIN);
        } else {
          onSuccess();
        }
      });

    db.loadUser(
      credentials.username,
      (user) => verifyPassword(user),
      (error) => onError(CONST.ERROR_LOGIN)
    );
  };
  const decodeSessionToken = (encodedToken) => {
    const token = Buffer.from(encodedToken, "base64").toString("ascii");
    const [username, session] = token.split("=", 2);
    return [username, session];
  };

  const authenticateUser = (credentials, onSuccess, onError) => {
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
      onSuccess(
        sessions[credentials.username][token],
        `${credentials.username}=${token}`
      );
    };
    checkUserPassword(credentials, handleSuccess, onError);
  };
  const revokeSession = (encodedToken, onSuccess, onError) => {
    const [username, session] = decodeSessionToken(encodedToken);
    if (!username || !session) {
      onSuccess();
      return;
    }

    if (username in sessions && session in sessions[username]) {
      // TODO: DB
      delete sessions[username][session];
    }
    if (CONST.DEBUG) console.log(sessions);
    onSuccess();
  };
  const revokeAllSessions = (credentials, onSuccess, onError) => {
    const handleSuccess = () => {
      if (credentials.username in sessions) {
        // TODO: DB
        delete sessions[credentials.username];
      }
      if (CONST.DEBUG) console.log(sessions);
      onSuccess();
    };
    checkUserPassword(credentials, handleSuccess, onError);
  };
  const verifySession = (encodedToken, onSuccess, onError) => {
    const [username, session] = decodeSessionToken(encodedToken);
    // TODO: DB
    if (!(username in sessions) || !(session in sessions[username])) {
      onError(CONST.ERROR_LOGIN);
      return;
    }
    const now = new Date();
    if (sessions[username][session].updated < now - CONST.SESSION_LENGTH_MS) {
      onError(CONST.ERROR_SESSION_EXPIRED);
    } else {
      sessions[username][session].updated = now;
      if (CONST.DEBUG) console.log(sessions);
      onSuccess(sessions[username][session]);
    }
  };

  return {
    authenticateUser,
    revokeSession,
    revokeAllSessions,
    verifySession,
  };
};
