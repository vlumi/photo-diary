const CONST = require("../utils/constants");
const logger = require("../utils/logger");

const authorizer = require("../utils/authorizer")();
const tokensModel = require("../models/tokens")();

const init = async () => {
  await tokensModel.init();
};
const router = require("express").Router();

module.exports = {
  init,
  router,
};

/**
 * Verify and keep-alive token.
 */
router.get("/", (request, response) => {
  response.status(200).end();
});
/**
 * Login, creating a new token.
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
  const token = await tokensModel.authenticateUser(credentials);
  logger.debug(`User "${credentials.username}" logged in successfully.`);

  const encodedToken = Buffer.from(token).toString("base64");
  response.status(200).send({ token: encodedToken }).end();
});
/**
 * Logout, revoking all tokens.
 */
router.delete("/", async (request, response) => {
  await tokensModel.revokeToken(request.user.username);
  response.status(204).end();
});
/**
 * Logout, revoking all tokens.
 */
router.delete("/:username", async (request, response) => {
  await authorizer.authorizeAdmin(request.user.username);
  await tokensModel.revokeToken(request.param.username);
  response.status(204).end();
});
