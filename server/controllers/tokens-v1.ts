import type { FastifyPluginAsync } from "fastify";

import { LoginError } from "../lib/errors.js";
import logger from "../lib/logger.js";
import authorizerFactory from "../lib/authorizer.js";
import modelFactory from "../models/token.js";

const authorizer = authorizerFactory();
const model = modelFactory();

const init = async () => {
  await model.init();
};

interface LoginBody {
  id?: string;
  password?: string;
}

// Per-IP throttle for the login POST. 10 *failed* attempts per 15-minute
// window: a successful login doesn't tick the counter, so a typo'ing operator
// who then gets it right isn't penalised — only sustained guessing is. The
// GET keep-alive and DELETE logout paths aren't rate-limited (they're
// routine app traffic).
//
// In-memory only; per-IP keying off `request.ip` (which respects
// `trustProxy: 1`, so behind nginx with `X-Forwarded-For` forwarded, it's
// the real client IP). On server restart the counter resets — fine for a
// self-hosted single-instance deploy.
//
// `@fastify/rate-limit` was the natural plugin choice but doesn't support
// the equivalent of express-rate-limit's `skipSuccessfulRequests`, which
// was the whole point of #213. Twenty lines of plain Map state preserves
// the 0.7.3 behavior without pulling in a custom store.
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

const plugin: FastifyPluginAsync = async (fastify) => {
  /**
   * Verify and keep-alive token.
   */
  fastify.get("/", async (_request, reply) => {
    reply.status(200).send();
  });

  /**
   * Login, creating a new token.
   */
  fastify.post<{ Body: LoginBody }>("/", async (request, reply) => {
    if (isRateLimited(request.ip)) {
      reply
        .status(429)
        .send({ error: "Too many failed login attempts. Try again later." });
      return;
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
  });

  /**
   * Logout, revoking the requesting user's tokens.
   */
  fastify.delete("/", async (request, reply) => {
    await model.revokeToken(request.user.id);
    reply.status(204).send();
  });

  /**
   * Logout (admin), revoking all tokens for another user.
   */
  fastify.delete<{ Params: { userId: string } }>(
    "/:userId",
    async (request, reply) => {
      await authorizer.authorizeAdmin(request.user.id);
      await model.revokeToken(request.params.userId);
      reply.status(204).send();
    }
  );
};

export default { init, plugin };
