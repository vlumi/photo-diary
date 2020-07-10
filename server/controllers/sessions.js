const CONST = require("../utils/constants");
const logger = require("../utils/logger");

const router = require("express").Router();
module.exports = router;

const authorizer = require("../utils/authorizer")();
const sessionsModel = require("../models/sessions")();

/**
 * Login, creating a new session.
 */
router.post("/", (request, response, next) => {
  logger.debug("Login", request.body);
  const credentials = {
    username: request.body.username,
    password: request.body.password,
  };
  if (!credentials.username || !credentials.password) {
    next(CONST.ERROR_LOGIN);
    return;
  }
  sessionsModel
    .authenticateUser(credentials)
    .then((sessionToken) => {
      const [session, token] = sessionToken;
      logger.debug(`User "${credentials.username}" logged in successfully.`);

      request.session = session;
      const encodedToken = Buffer.from(token).toString("base64");
      // TODO: set cookie expiration
      response.cookie("token", encodedToken);
      response.status(204).end();
    })
    .catch((error) => next(error));
});
/**
 * Logout, revoking the session.
 */
router.delete("/", (request, response, next) => {
  sessionsModel
    .revokeSession(request.cookies["token"])
    .then(() => {
      response.clearCookie("token");
      response.status(204).end();
    })
    .catch((error) => {
      response.clearCookie("token");
      next(error);
    });
});
/**
 * Revoke all sessions of a user.
 */
router.post("/revoke-all", (request, response, next) => {
  const credentials = {
    username: request.body.username,
    password: request.body.password,
  };
  if (!credentials.username) {
    next(CONST.ERROR_LOGIN);
    return;
  }
  authorizer
    .authorizeAdmin(request.session.username)
    .then(() => {
      sessionsModel
        .revokeAllSessionsAdmin(credentials)
        .then(() => response.status(204).end())
        .catch((error) => next(error));
    })
    .catch(() => {
      if (!credentials.password) {
        next(CONST.ERROR_LOGIN);
        return;
      }
      sessionsModel
        .revokeAllSessions(credentials)
        .then(() => {
          response.clearCookie("token");
          response.status(204).end();
        })
        .catch((error) => next(error));
    });
});
