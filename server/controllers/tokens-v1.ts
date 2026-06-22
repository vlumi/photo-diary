import { Type } from "typebox";
import { type FastifyPluginAsyncTypebox } from "@fastify/type-provider-typebox";

import config from "../lib/config/index.js";
import db from "../db/index.js";
import {
  AccessError,
  InvalidTokenError,
  LoginError,
  RateLimitError,
} from "../lib/errors.js";
import {
  REFRESH_COOKIE,
  clearAuthCookies,
  setAuthCookies,
} from "../lib/auth-cookies.js";
import logger from "../lib/logger.js";
import authorizerFactory from "../lib/authorizer.js";
import modelFactory from "../models/token.js";
import {
  mintSsoToken,
  verifySsoToken,
  SSO_TOKEN_TTL_MS,
} from "../lib/sso.js";

const authorizer = authorizerFactory();
const model = modelFactory();

const init = async () => {
  await model.init();
};

// Pull the operator-curated host list out of meta and reduce to
// lowercased hostnames for case-insensitive comparison. Empty when
// unset / malformed — the cross-host endpoint then rejects every
// target, effectively disabling the feature without an explicit
// toggle.
const loadKnownHosts = async (): Promise<string[]> => {
  try {
    const metas = await db.loadMetas();
    const raw = metas.instance_knownHosts;
    if (typeof raw !== "string" || raw.length === 0) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (e): e is { hostname: string } =>
          !!e && typeof (e as { hostname?: unknown }).hostname === "string"
      )
      .map((e) => e.hostname.toLowerCase());
  } catch {
    return [];
  }
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
// Login + refresh + change-password all return the same session
// shape: identity + admin flag + editor-gallery ids the client uses
// to render the right tile set. JWTs travel only as HttpOnly cookies
// (set on the response by `setAuthCookies` below); the SPA never
// sees them.
const SessionResponse = Type.Object({
  id: Type.String(),
  isAdmin: Type.Boolean(),
  editorGalleries: Type.Array(Type.String()),
});

const UserIdParam = Type.Object({ userId: Type.String() });

// SSO mint (#664). `target` is the hostname the SPA wants to hop to;
// `path` is the optional in-app path the target host should land
// on after consuming the token (best-effort, validated to be a
// leading-slash path so an attacker can't redirect cross-origin
// after consume).
const CrossHostBody = Type.Object({
  target: Type.String({ minLength: 1 }),
  path: Type.Optional(Type.String()),
});
const CrossHostResponse = Type.Object({
  redirectUrl: Type.String(),
});

// SSO consume — the token + redirect both ride in the URL because
// the browser is navigating (not the SPA making a fetch).
const SsoConsumeQuery = Type.Object({
  token: Type.String({ minLength: 1 }),
  redirect: Type.Optional(Type.String()),
});

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
        summary: "Log in (sets HttpOnly auth cookies)",
        body: LoginBody,
        response: { 200: SessionResponse },
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
      reply.status(200).send({ id: credentials.id, isAdmin, editorGalleries });
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
        summary: "Rotate refresh token, mint a new access token (cookie-only)",
        response: { 200: SessionResponse },
      },
    },
    async (request, reply) => {
      const submitted = request.cookies?.[REFRESH_COOKIE];
      if (!submitted) throw new InvalidTokenError();
      const { userId, refreshToken } =
        await model.verifyAndRotateRefresh(submitted);
      const isAdmin = await resolveIsAdmin(userId);
      const accessToken = await model.signAccessToken(userId, isAdmin);
      const editorGalleries = await authorizer.loadEditorGalleries(userId);
      setAuthCookies(reply, accessToken, refreshToken);
      reply.status(200).send({ id: userId, isAdmin, editorGalleries });
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
        summary: "Log out (revoke this session, clear auth cookies)",
        security: [{ bearer: [] }],
      },
    },
    async (request, reply) => {
      const submitted = request.cookies?.[REFRESH_COOKIE];
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

  /**
   * Cross-host SSO mint (#664). Authed caller asks this host to mint
   * a one-shot signed token bound to a target hostname; the SPA
   * redirects the browser to the target's /sso endpoint, which
   * verifies + sets cookies there. Targets are validated against
   * `instance_knownHosts` — empty list (the default) effectively
   * disables the feature without an explicit toggle.
   */
  fastify.post(
    "/cross-host",
    {
      schema: {
        tags: TAGS,
        summary: "Mint a one-shot SSO token for a sibling host (#664)",
        body: CrossHostBody,
        response: { 200: CrossHostResponse },
        security: [{ bearer: [] }],
      },
    },
    async (request) => {
      if (request.user.id === ":guest") {
        throw new AccessError();
      }
      const { target, path } = request.body;
      // Target must be one of the operator-curated known hosts —
      // prevents minting SSO tokens for arbitrary hostnames, even
      // though without the matching SECRET on the receiving side
      // such a token would be useless.
      const knownHosts = await loadKnownHosts();
      if (!knownHosts.includes(target.toLowerCase())) {
        throw new AccessError(
          "Target hostname is not in the configured knownHosts set."
        );
      }
      const token = await mintSsoToken(
        config.SECRET,
        request.user.id,
        target
      );
      const safePath =
        path && path.startsWith("/") ? path : "/";
      const redirectUrl =
        `https://${target}/api/v1/tokens/sso` +
        `?token=${encodeURIComponent(token)}` +
        `&redirect=${encodeURIComponent(safePath)}`;
      return { redirectUrl };
    }
  );

  /**
   * Cross-host SSO consume. Validates the signed token, checks the
   * target audience matches this host, checks the jti is single-use
   * (DB dedup), mints normal pd_access + pd_refresh cookies for the
   * matching user, and 302s to the post-SSO path. GET because the
   * browser is navigating; the token sits in the URL.
   */
  fastify.get(
    "/sso",
    {
      schema: {
        tags: TAGS,
        summary: "Consume a cross-host SSO token + redirect (#664)",
        querystring: SsoConsumeQuery,
      },
    },
    async (request, reply) => {
      const { token, redirect } = request.query;
      const claims = await verifySsoToken(
        config.SECRET,
        request.hostname.toLowerCase(),
        token
      );
      const won = await db.consumeSsoJti(
        claims.jti,
        Date.now(),
        SSO_TOKEN_TTL_MS
      );
      if (!won) {
        // Replay attempt — same jti already consumed (either by an
        // earlier legitimate visit or a hostile re-send).
        throw new InvalidTokenError();
      }
      // The user must exist on this host with the same id. SSO
      // doesn't propagate user rows — the operator's identity is
      // assumed to be provisioned on every instance they own.
      const isAdmin = await authorizer
        .authorizeAdmin(claims.sub)
        .then(() => true)
        .catch(() => false);
      const pair = await model.createSession(claims.sub, isAdmin);
      setAuthCookies(reply, pair.accessToken, pair.refreshToken);
      const safeRedirect =
        redirect && redirect.startsWith("/") ? redirect : "/";
      reply.redirect(safeRedirect, 302);
    }
  );
};

export default { init, plugin };
