import type { FastifyReply } from "fastify";

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

const cookieOptions = (maxAgeS: number) => ({
  httpOnly: true,
  // Browsers allow Secure on http://localhost too, so this is safe in dev.
  secure: true,
  sameSite: "lax" as const,
  path: "/",
  maxAge: maxAgeS,
});

export const setAuthCookies = (
  reply: FastifyReply,
  accessToken: string,
  refreshToken: string
): void => {
  reply.setCookie(ACCESS_COOKIE, accessToken, cookieOptions(COOKIE_MAX_AGE_S));
  reply.setCookie(
    REFRESH_COOKIE,
    refreshToken,
    cookieOptions(COOKIE_MAX_AGE_S)
  );
};

export const clearAuthCookies = (reply: FastifyReply): void => {
  reply.clearCookie(ACCESS_COOKIE, { path: "/" });
  reply.clearCookie(REFRESH_COOKIE, { path: "/" });
};
