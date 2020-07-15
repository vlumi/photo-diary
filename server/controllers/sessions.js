const CONST = require("../utils/constants");
const logger = require("../utils/logger");

const authorizer = require("../utils/authorizer")();
const sessionsModel = require("../models/sessions")();

const init = async () => {
  await sessionsModel.init();
};
const router = require("express").Router();

module.exports = {
  init,
  router,
};

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
  const token = await sessionsModel.authenticateUser(credentials);
  logger.debug(`User "${credentials.username}" logged in successfully.`);

  // request.session = session;
  const encodedToken = Buffer.from(token).toString("base64");
  response.status(200).send({ token: encodedToken }).end();
});
/**
 * Logout, revoking all tokens.
 */
router.delete("/", async (request, response) => {
  await sessionsModel.revokeSession(request.session.username);
  response.status(204).end();
});
/**
 * Logout, revoking all tokens.
 */
router.delete("/:username", async (request, response) => {
  await authorizer.authorizeAdmin(request.session.username);
  await sessionsModel.revokeSession(request.param.username);
  response.status(204).end();
});
