const CONST = require("../utils/constants");
const logger = require("../utils/logger");

const router = require("express").Router();
module.exports = router;

const authorizer = require("../utils/authorizer")();
const sessionsModel = require("../models/sessions")();

/**
 * Verify and keep-alive session.
 */
router.get("/", (request, response) => {
  response.status(200).end();
});
/**
 * Login, creating a new session.
 */
router.post("/", async (request, response, next) => {
  logger.debug("Login", request.body);
  const credentials = {
    username: request.body.username,
    password: request.body.password,
  };
  if (!credentials.username || !credentials.password) {
    next(CONST.ERROR_LOGIN);
    return;
  }
  const [session, token] = await sessionsModel.authenticateUser(credentials);
  logger.debug(`User "${credentials.username}" logged in successfully.`);

  request.session = session;
  const encodedToken = Buffer.from(token).toString("base64");
  // TODO: set cookie expiration
  response.status(200).send({token: encodedToken}).end();
  // response.status(200).send({token: encodedToken});
});
/**
 * Logout, revoking the session.
 */
router.delete("/", async (request, response) => {
  await sessionsModel.revokeSession(request.cookies["token"]);

  response.clearCookie("token");
  response.status(204).end();
});
/**
 * Revoke all sessions of a user.
 */
router.post("/revoke-all", async (request, response, next) => {
  const credentials = {
    username: request.body.username,
    password: request.body.password,
  };
  if (!credentials.username) {
    next(CONST.ERROR_LOGIN);
    return;
  }
  try {
    await authorizer.authorizeAdmin(request.session.username);
    await sessionsModel.revokeAllSessionsAdmin(credentials);
    response.status(204).end();
  } catch (error) {
    if (!credentials.password) {
      next(CONST.ERROR_LOGIN);
      return;
    }
    await sessionsModel.revokeAllSessions(credentials);
    response.clearCookie("token");
    response.status(204).end();
  }
});
