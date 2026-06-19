import { Type } from "typebox";
import { type FastifyPluginAsyncTypebox } from "@fastify/type-provider-typebox";

import { InvalidTokenError, LoginError, RateLimitError } from "../lib/errors.js";
import {
  REFRESH_COOKIE,
  clearAuthCookies,
  setAuthCookies,
} from "../lib/auth-cookies.js";
import logger from "../lib/logger.js";
import authorizerFactory from "../lib/authorizer.js";
import modelFactory from "../models/token.js";

const authorizer = authorizerFactory();
const model = modelFactory();

const init = async () => {
  await model.init();
};

// Fields are optional in the schema so missing credentials hit the
// handler's 401 path; making them required would short-circuit to
// a 400 which clients don't expect.
const LoginBody = Type.Object({
  id: Type.Optional(Type.String()),
  password: Type.Optional(Type.String()),
});
// Login + refresh both return the same shape: a short-lived JWT for
// API calls + an opaque refresh token (sessionId.secret) for the
// rotation endpoint + the user's current set of editor-grant
// gallery ids (purely a client-rendering hint; the server still
// enforces every request via the authorizer).
const TokenPairResponse = Type.Object({
  accessToken: Type.String(),
  refreshToken: Type.String(),
  editorGalleries: Type.Array(Type.String()),
});
// `refreshToken` is optional so cookie-only clients can hit /refresh
// with no body. Legacy SPAs continue to POST the token explicitly.
const RefreshBody = Type.Object({
  refreshToken: Type.Optional(Type.String()),
});
const LogoutBody = Type.Object({
  // Optional so an already-invalid refresh token (e.g. expired and
  // already cleared client-side) still hits the idempotent revoke path.
  refreshToken: Type.Optional(Type.String()),
});

const UserIdParam = Type.Object({ userId: Type.String() });

// Per-IP throttle on the login POST: 10 failed attempts per 15-min
// window. Successful logins don't tick the counter (a typo'ing user
// shouldn't be penalised). In-memory; resets on restart.
// `@fastify/rate-limit` doesn't have express-rate-limit's
// `skipSuccessfulRequests`, hence the hand-rolled Map.
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_MAX_FAILURES = 10;
const failedLogins = new Map<string, { count: number; firstAt: number }>();

const isRateLimited = (ip: string): boolean => {
  const now = Date.now();
  const entry = failedLogins.get(ip);
  if (!entry || now - entry.firstAt > LOGIN_WINDOW_MS) {
    return false;
  }
  return entry.count >= LOGIN_MAX_FAILURES;
};

const recordLoginFailure = (ip: string) => {
  const now = Date.now();
  const entry = failedLogins.get(ip);
  if (!entry || now - entry.firstAt > LOGIN_WINDOW_MS) {
    failedLogins.set(ip, { count: 1, firstAt: now });
    return;
  }
  entry.count += 1;
};

// Test-only — reset between rate-limit tests.
export const _resetLoginRateLimitForTests = () => {
  failedLogins.clear();
};

const TAGS = ["tokens"];

// Resolve isAdmin via the access cascade. Used at login + refresh so the
// freshly-signed access token reflects current authorization state (e.g.
// admin grant removed mid-session takes effect on the next refresh).
const resolveIsAdmin = async (userId: string): Promise<boolean> => {
  return authorizer
    .authorizeAdmin(userId)
    .then(() => true)
    .catch(() => false);
};

const plugin: FastifyPluginAsyncTypebox = async (fastify) => {
  /**
   * Verify and keep-alive token.
   */
  fastify.get(
    "/",
    { schema: { tags: TAGS, summary: "Verify token (keep-alive)" } },
    async (_request, reply) => {
      reply.status(200).send();
    }
  );

  /**
   * Login. Issues an access token (short-lived JWT) and a refresh token
   * (long-lived opaque). The refresh token is tracked server-side in the
   * session table — `DELETE /tokens` revokes it.
   */
  fastify.post(
    "/",
    {
      schema: {
        tags: TAGS,
        summary: "Log in, issuing access + refresh tokens",
        body: LoginBody,
        response: { 200: TokenPairResponse },
      },
    },
    async (request, reply) => {
      if (isRateLimited(request.ip)) {
        throw new RateLimitError(
          "Too many failed login attempts. Try again later."
        );
      }
      // Lowercase the typed id so iOS-autocapitalized "Admin" matches
      // the stored lowercase user.id. Migration 017 ensures every
      // existing user.id is already lowercase.
      const typedId = request.body?.id?.toLowerCase();
      logger.debug(`Login attempt for "${typedId}"`);
      const credentials = {
        id: typedId,
        password: request.body?.password,
      };
      if (!credentials.id || !credentials.password) {
        recordLoginFailure(request.ip);
        throw new LoginError();
      }
      try {
        await model.authenticateUser({
          id: credentials.id,
          password: credentials.password,
        });
      } catch (error) {
        recordLoginFailure(request.ip);
        throw error;
      }
      const isAdmin = await resolveIsAdmin(credentials.id);
      const pair = await model.createSession(credentials.id, isAdmin);
      const editorGalleries = await authorizer.loadEditorGalleries(
        credentials.id
      );
      setAuthCookies(reply, pair.accessToken, pair.refreshToken);
      logger.debug(`User "${credentials.id}" logged in successfully.`);
      // Tokens still travel in the response body for back-compat: the
      // legacy SPA reads them from there and writes to localStorage.
      // New SPAs ignore the body tokens and rely on the cookies set
      // above. Removable once all clients are on the cookie path.
      reply.status(200).send({ ...pair, editorGalleries });
    }
  );

  /**
   * Refresh. Validates the refresh token (sliding window of
   * `SESSION_LENGTH_MS`), rotates it, returns a new pair. The old refresh
   * token immediately stops working — a stolen-but-already-used token
   * fails on the next call from the legitimate client too, flagging the
   * breach via a forced re-login.
   */
  fastify.post(
    "/refresh",
    {
      schema: {
        tags: TAGS,
        summary: "Rotate refresh token, issue a new access token",
        body: RefreshBody,
        response: { 200: TokenPairResponse },
      },
    },
    async (request, reply) => {
      const submitted =
        request.body?.refreshToken ?? request.cookies?.[REFRESH_COOKIE];
      if (!submitted) throw new InvalidTokenError();
      const { userId, refreshToken } =
        await model.verifyAndRotateRefresh(submitted);
      const isAdmin = await resolveIsAdmin(userId);
      const accessToken = await model.signAccessToken(userId, isAdmin);
      const editorGalleries = await authorizer.loadEditorGalleries(userId);
      setAuthCookies(reply, accessToken, refreshToken);
      reply.status(200).send({ accessToken, refreshToken, editorGalleries });
    }
  );

  /**
   * Logout: revoke this device's session by deleting its row. Idempotent
   * on a missing / malformed refresh token so client-side log-out flows
   * never fail.
   */
  fastify.delete(
    "/",
    {
      schema: {
        tags: TAGS,
        summary: "Log out (revoke this session)",
        body: LogoutBody,
        security: [{ bearer: [] }],
      },
    },
    async (request, reply) => {
      const submitted =
        request.body?.refreshToken ?? request.cookies?.[REFRESH_COOKIE];
      if (submitted) {
        await model.revokeSession(submitted);
      }
      clearAuthCookies(reply);
      reply.status(204).send();
    }
  );

  /**
   * Logout (admin): revoke all sessions for another user.
   */
  fastify.delete(
    "/:userId",
    {
      schema: {
        tags: TAGS,
        summary: "Revoke all sessions for another user (admin)",
        params: UserIdParam,
        security: [{ bearer: [] }],
      },
    },
    async (request, reply) => {
      await authorizer.authorizeAdmin(request.user.id);
      await model.revokeAllSessions(request.params.userId);
      reply.status(204).send();
    }
  );
};

export default { init, plugin };
