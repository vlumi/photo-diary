import type { FastifyRequest, onRequestHookHandler } from "fastify";

import CONST from "../constants.js";
import { InvalidTokenError, TokenExpiredError } from "../errors.js";
import tokenFactory from "../../models/token.js";
import logger from "../logger.js";

const tokensModel = tokenFactory();

// Cookie-only auth. Tests set the `pd_access` cookie via supertest;
// the SPA writes it via the HttpOnly cookies issued at login.
const getToken = (request: FastifyRequest): string | undefined => {
  return request.cookies?.pd_access;
};

const tokenFilter: onRequestHookHandler = async (request) => {
  request.token = undefined;

  // Static assets + SPA routes never inspect request.user. Throwing a
  // 401 here on an expired token would return raw JSON in place of
  // index.html — a page refresh mid-session would surface
  // `{"error":"Token expired"}` in the address bar instead of loading
  // the SPA. Skip cleanly; the SPA reactively refreshes on the first
  // /api/* 401 after it boots.
  if (!request.url.startsWith("/api/")) {
    request.user = { id: CONST.GUEST_USER };
    return;
  }

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
