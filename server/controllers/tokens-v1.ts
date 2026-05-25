import { Type } from "typebox";
import { type FastifyPluginAsyncTypebox } from "@fastify/type-provider-typebox";

import { LoginError, RateLimitError } from "../lib/errors.js";
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
const LoginResponse = Type.Object({ token: Type.String() });

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
   * Login, creating a new token.
   */
  fastify.post(
    "/",
    {
      schema: {
        tags: TAGS,
        summary: "Log in, issuing a new token",
        body: LoginBody,
        response: { 200: LoginResponse },
      },
    },
    async (request, reply) => {
      if (isRateLimited(request.ip)) {
        throw new RateLimitError(
          "Too many failed login attempts. Try again later."
        );
      }
      logger.debug(`Login attempt for "${request.body?.id}"`);
      const credentials = {
        id: request.body?.id,
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
      const token = await authorizer
        .authorizeAdmin(credentials.id)
        .then(() => model.createToken(credentials.id as string, true))
        .catch(() => model.createToken(credentials.id as string, false));
      logger.debug(`User "${credentials.id}" logged in successfully.`);
      reply.status(200).send({ token });
    }
  );

  /**
   * Logout, revoking the requesting user's tokens.
   */
  fastify.delete(
    "/",
    {
      schema: {
        tags: TAGS,
        summary: "Log out (revoke all tokens for the requester)",
        security: [{ bearer: [] }],
      },
    },
    async (request, reply) => {
      await model.revokeToken(request.user.id);
      reply.status(204).send();
    }
  );

  /**
   * Logout (admin), revoking all tokens for another user.
   */
  fastify.delete(
    "/:userId",
    {
      schema: {
        tags: TAGS,
        summary: "Revoke all tokens for another user (admin)",
        params: UserIdParam,
        security: [{ bearer: [] }],
      },
    },
    async (request, reply) => {
      await authorizer.authorizeAdmin(request.user.id);
      await model.revokeToken(request.params.userId);
      reply.status(204).send();
    }
  );
};

export default { init, plugin };
