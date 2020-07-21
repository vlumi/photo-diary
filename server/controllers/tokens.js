const CONST = require("../utils/constants");
const logger = require("../utils/logger");

const authorizer = require("../utils/authorizer")();
const model = require("../models/token")();

const init = async () => {
  await model.init();
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
    id: request.body.id,
    password: request.body.password,
  };
  if (!credentials.id || !credentials.password) {
    next(CONST.ERROR_LOGIN);
    return;
  }
  const token = await model.authenticateUser(credentials);
  logger.debug(`User "${credentials.id}" logged in successfully.`);

  const encodedToken = Buffer.from(token).toString("base64");
  response.status(200).send({ token: encodedToken }).end();
});
/**
 * Logout, revoking all tokens.
 */
router.delete("/", async (request, response) => {
  await model.revokeToken(request.user.id);
  response.status(204).end();
});
/**
 * Logout, revoking all tokens.
 */
router.delete("/:userId", async (request, response) => {
  await authorizer.authorizeAdmin(request.user.id);
  await model.revokeToken(request.param.userId);
  response.status(204).end();
});
