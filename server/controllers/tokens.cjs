const CONST = require("../lib/constants.cjs");
const logger = require("../lib/logger.cjs");

const authorizer = require("../lib/authorizer.cjs")();
const model = require("../models/token.cjs")();

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
  await model.authenticateUser(credentials);
  const token = await authorizer
    .authorizeAdmin(credentials.id)
    .then(async () => {
      return await model.createToken(credentials.id, true);
    })
    .catch(async () => {
      return await model.createToken(credentials.id, false);
    });
  logger.debug(`User "${credentials.id}" logged in successfully.`);

  response.status(200).send({ token: token }).end();
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
