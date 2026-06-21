import type { FastifyRequest, onRequestHookHandler } from "fastify";

import CONST from "../constants.js";
import { InvalidTokenError, TokenExpiredError } from "../errors.js";
import tokenFactory from "../../models/token.js";
import logger from "../logger.js";

const tokensModel = tokenFactory();

// Cookie-only since #650 (the bearer-header fallback was a transition
// affordance for cached pre-cookie SPA bundles). New tests set the
// `pd_access` cookie via supertest; the SPA writes it via the
// HttpOnly cookies issued at login.
const getToken = (request: FastifyRequest): string | undefined => {
  return request.cookies?.pd_access;
};

const tokenFilter: onRequestHookHandler = async (request) => {
  request.token = undefined;

  const token = getToken(request);
  if (!token || (request.url === "/api/tokens" && request.method === "POST")) {
    logger.debug("Using anonymous guest");
    request.user = { id: CONST.GUEST_USER };
    return;
  }
  try {
    const user = await tokensModel.verifyToken(token);
    logger.debug("Verified token", user);
    request.user = user as unknown as FastifyRequest["user"];
    request.token = token;
  } catch (error) {
    logger.debug("Token verification failed", error);
    // Surface the expired-vs-invalid distinction the model throws so the
    // SPA can show the re-login modal on expiry; opaque verification
    // failures (signature mismatch, malformed, tampered) stay as
    // `InvalidTokenError`.
    if (error instanceof TokenExpiredError) {
      throw error;
    }
    throw new InvalidTokenError();
  }
};

export default tokenFilter;
