import type { FastifyRequest, onRequestHookHandler } from "fastify";

import CONST from "../constants.js";
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
  if (!token) {
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
    // Degrade to anonymous on any verification failure (expired,
    // invalid signature, malformed). Routes that require auth throw
    // their own 401 downstream via the authorizer; routes that don't
    // (meta, public gallery reads) proceed as guest. Throwing here
    // would 401 the meta endpoint too, breaking SPA boot when the
    // browser still holds a stale cookie.
    logger.debug("Token verification failed; falling back to guest", error);
    request.user = { id: CONST.GUEST_USER };
  }
};

export default tokenFilter;
