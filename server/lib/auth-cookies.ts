import type { FastifyReply, FastifyRequest } from "fastify";

import CONST from "./constants.js";

// HttpOnly auth cookies. Two cookies with different roles: pd_access
// carries a short-lived JWT (15 min), pd_refresh points at the
// long-lived DB-tracked session row (90 days).
//
// Both cookies get the same Max-Age (session length). Making
// pd_access's cookie shorter than its JWT's exp is what would cause
// the "silent guest" bug: browsers strictly enforce Max-Age, so
// once it elapses the cookie is gone from the jar, subsequent
// requests carry no pd_access, and `tokenFilter` treats a missing
// cookie as anonymous guest (no 401 to trigger the refresh path).
// The JWT's own `exp` claim is what actually gates access — an
// expired JWT still in the jar returns 401 and the client's
// refresh flow kicks in normally.
const ACCESS_COOKIE = "pd_access";
export const REFRESH_COOKIE = "pd_refresh";

const COOKIE_MAX_AGE_S = Math.floor(CONST.SESSION_LENGTH_MS / 1000);

// Secure follows the request's actual protocol. Behind nginx on prod
// `trustProxy: "loopback"` reports https and the attribute stays on;
// on a plain-http dev origin it must be off — Chrome and Firefox
// accept Secure cookies on http://localhost, but WebKit (Safari, the
// iOS Simulator) drops them on any http origin, which left the SPA
// "logged in" in localStorage while every request arrived as guest.
const cookieOptions = (maxAgeS: number, secure: boolean) => ({
  httpOnly: true,
  secure,
  sameSite: "lax" as const,
  path: "/",
  maxAge: maxAgeS,
});

export const setAuthCookies = (
  request: FastifyRequest,
  reply: FastifyReply,
  accessToken: string,
  refreshToken: string
): void => {
  const secure = request.protocol === "https";
  reply.setCookie(
    ACCESS_COOKIE,
    accessToken,
    cookieOptions(COOKIE_MAX_AGE_S, secure)
  );
  reply.setCookie(
    REFRESH_COOKIE,
    refreshToken,
    cookieOptions(COOKIE_MAX_AGE_S, secure)
  );
};

export const clearAuthCookies = (reply: FastifyReply): void => {
  reply.clearCookie(ACCESS_COOKIE, { path: "/" });
  reply.clearCookie(REFRESH_COOKIE, { path: "/" });
};
