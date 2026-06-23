import type { FastifyReply } from "fastify";

import CONST from "./constants.js";

// HttpOnly auth cookies. Two cookies because the access and refresh
// tokens have very different lifetimes — splitting them lets the
// browser drop the short-lived access cookie on its own without
// touching the long-lived refresh cookie. New SPAs read neither
// directly; same-origin requests pick up both automatically.
const ACCESS_COOKIE = "pd_access";
export const REFRESH_COOKIE = "pd_refresh";

const ACCESS_COOKIE_MAX_AGE_S = Math.floor(
  CONST.ACCESS_TOKEN_LIFETIME_MS / 1000
);
const REFRESH_COOKIE_MAX_AGE_S = Math.floor(CONST.SESSION_LENGTH_MS / 1000);

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
  reply.setCookie(
    ACCESS_COOKIE,
    accessToken,
    cookieOptions(ACCESS_COOKIE_MAX_AGE_S)
  );
  reply.setCookie(
    REFRESH_COOKIE,
    refreshToken,
    cookieOptions(REFRESH_COOKIE_MAX_AGE_S)
  );
};

export const clearAuthCookies = (reply: FastifyReply): void => {
  reply.clearCookie(ACCESS_COOKIE, { path: "/" });
  reply.clearCookie(REFRESH_COOKIE, { path: "/" });
};
