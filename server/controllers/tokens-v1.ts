import express from "express";
import rateLimit from "express-rate-limit";

import { LoginError } from "../lib/errors.js";
import logger from "../lib/logger.js";
import authorizerFactory from "../lib/authorizer.js";
import modelFactory from "../models/token.js";

const authorizer = authorizerFactory();
const model = modelFactory();

const init = async () => {
  await model.init();
};
const router = express.Router();

// Per-IP throttle for the login POST. The GET keep-alive and DELETE logout
// paths aren't rate-limited (they're routine app traffic). 10 *failed*
// attempts per 15-minute window: `skipSuccessfulRequests: true` means a
// successful login doesn't tick the counter, so a typo'ing operator who then
// gets it right isn't penalised — only sustained guessing is. Per-IP only;
// keys off `req.ip`, which requires nginx to forward `X-Forwarded-For` (the
// README's nginx section shows the headers).
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  skipSuccessfulRequests: true,
  message: { error: "Too many failed login attempts. Try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

export default { init, router };

/**
 * Verify and keep-alive token.
 */
router.get("/", (request, response) => {
  response.status(200).end();
});
/**
 * Login, creating a new token.
 */
router.post("/", loginLimiter, async (request, response, next) => {
  logger.debug(`Login attempt for "${request.body?.id}"`);
  const credentials = {
    id: request.body.id,
    password: request.body.password,
  };
  if (!credentials.id || !credentials.password) {
    next(new LoginError());
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
  await model.revokeToken(request.params.userId);
  response.status(204).end();
});
