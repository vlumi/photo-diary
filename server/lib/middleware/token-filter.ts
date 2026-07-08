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

// Paths that must never verify pd_access — the browser may still be
// holding a stale/expired access cookie, and these are precisely the
// endpoints the SPA reaches for when trying to recover from that
// state. Verifying would 401 before the controller runs and strand
// the client with no way forward. Static/SPA routes are handled by a
// separate short-circuit in `tokenFilter`.
const isNoAuthEndpoint = (url: string, method: string): boolean => {
  const path = url.split("?")[0];
  // Login / refresh / logout: recovery paths.
  if (path === "/api/v1/tokens/refresh" && method === "POST") return true;
  if (path === "/api/v1/tokens" && (method === "POST" || method === "DELETE")) {
    return true;
  }
  // /api/v1/meta is public — SPA reads it on every boot for the
  // instance's default theme / feature flags. A stale pd_access
  // cookie must not block SPA boot.
  if (path.startsWith("/api/v1/meta") && method === "GET") return true;
  return false;
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

  // Recovery + public endpoints: skip verification entirely so a stale
  // pd_access cookie doesn't block SPA boot or the refresh flow.
  if (isNoAuthEndpoint(request.url, request.method)) {
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
    // Throw 401 on any verification failure so the SPA's client-side
    // refresh flow kicks in. Degrading to anonymous would silently
    // downgrade the response to guest data — the SPA would think the
    // request succeeded, private galleries would appear empty, and
    // the user would see stale UI with no signal to refresh.
    logger.debug("Token verification failed", error);
    if (error instanceof TokenExpiredError) {
      throw error;
    }
    throw new InvalidTokenError();
  }
};

export default tokenFilter;
