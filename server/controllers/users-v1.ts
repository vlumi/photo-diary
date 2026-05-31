import { Type } from "typebox";
import { type FastifyPluginAsyncTypebox } from "@fastify/type-provider-typebox";

import CONST from "../lib/constants.js";
import { AccessError } from "../lib/errors.js";
import authorizerFactory from "../lib/authorizer.js";
import { requireUnscoped } from "../lib/host-scope.js";
import modelFactory from "../models/user.js";
import tokenFactory from "../models/token.js";

const authorizer = authorizerFactory();
const model = modelFactory();
const tokens = tokenFactory();

const init = async () => {
  await model.init();
};

const UserIdParam = Type.Object({ userId: Type.String() });
const UserSummary = Type.Object({ id: Type.String() });
const UsersListResponse = Type.Array(UserSummary);
const UserCreateBody = Type.Object({
  id: Type.String({ minLength: 1 }),
  password: Type.String({ minLength: 1 }),
});
const UserUpdateBody = Type.Object({
  password: Type.String({ minLength: 1 }),
});
const ChangePasswordBody = Type.Object({
  currentPassword: Type.String({ minLength: 1 }),
  newPassword: Type.String({ minLength: 1 }),
});
// Same shape as the login response — caller's existing session is killed
// (the user's `secret` rotates, invalidating its access JWT, and existing
// refresh tokens get cleared along with it), so the response carries a
// fresh pair for the same device to stay signed in.
const ChangePasswordResponse = Type.Object({
  accessToken: Type.String(),
  refreshToken: Type.String(),
});
const TAGS = ["users"];

const plugin: FastifyPluginAsyncTypebox = async (fastify) => {
  /**
   * Get all users.
   */
  fastify.get(
    "/",
    {
      schema: {
        tags: TAGS,
        summary: "List all users (admin)",
        response: { 200: UsersListResponse },
        security: [{ bearer: [] }],
      },
    },
    async (request) => {
      requireUnscoped(request);
      await authorizer.authorizeAdmin(request.user.id);
      const cleanUser = (user: { id: string }) => ({ id: user.id });
      const users = (await model.getUsers()) as Array<{ id: string }>;
      return users.map(cleanUser);
    }
  );

  /**
   * Create a user.
   */
  fastify.post(
    "/",
    {
      schema: {
        tags: TAGS,
        summary: "Create a user (admin)",
        body: UserCreateBody,
        security: [{ bearer: [] }],
      },
    },
    async (request, reply) => {
      requireUnscoped(request);
      await authorizer.authorizeAdmin(request.user.id);
      await model.createUser(request.body);
      reply.status(201).send();
    }
  );

  /**
   * Get the matching user.
   */
  fastify.get(
    "/:userId",
    {
      schema: {
        tags: TAGS,
        summary: "Get a user by id (admin)",
        params: UserIdParam,
        security: [{ bearer: [] }],
      },
    },
    async (request) => {
      await authorizer.authorizeAdmin(request.user.id);
      return await model.getUser(request.params.userId);
    }
  );

  /**
   * Update the matching user.
   */
  fastify.put(
    "/:userId",
    {
      schema: {
        tags: TAGS,
        summary: "Update a user by id (admin)",
        params: UserIdParam,
        body: UserUpdateBody,
        security: [{ bearer: [] }],
      },
    },
    async (request, reply) => {
      requireUnscoped(request);
      await authorizer.authorizeAdmin(request.user.id);
      await model.updateUser(request.params.userId, request.body);
      reply.status(204).send();
    }
  );

  /**
   * Delete the matching user.
   */
  fastify.delete(
    "/:userId",
    {
      schema: {
        tags: TAGS,
        summary: "Delete a user by id (admin)",
        params: UserIdParam,
        security: [{ bearer: [] }],
      },
    },
    async (request, reply) => {
      requireUnscoped(request);
      await authorizer.authorizeAdmin(request.user.id);
      await model.deleteUser(request.params.userId);
      reply.status(204).send();
    }
  );

  /**
   * Self-service password change. The caller's identity comes from the
   * verified JWT, so the path doesn't take a user id — the operator can't
   * accidentally (or maliciously) target someone else by tweaking the URL.
   */
  fastify.put(
    "/self/password",
    {
      schema: {
        tags: TAGS,
        summary: "Change the caller's own password",
        body: ChangePasswordBody,
        response: { 200: ChangePasswordResponse },
        security: [{ bearer: [] }],
      },
    },
    async (request) => {
      if (request.user.id === CONST.GUEST_USER) {
        // Guests have no password to change. AccessError matches the rest
        // of the "you can't do this" patterns in this codebase.
        throw new AccessError();
      }
      const { newSecret } = await model.changePassword(
        request.user.id,
        request.body.currentPassword,
        request.body.newPassword
      );
      // Rotate the in-memory cache so the freshly-minted JWT verifies on
      // the very next request — without this, signing would use the stale
      // cached secret and the new token would fail until the 5-second
      // cache reload caught up.
      tokens.setSecret(request.user.id, newSecret);
      // Other devices' sessions are now stale (their access JWTs verify
      // against the old secret, and their refresh tokens could otherwise
      // mint new JWTs under the new secret). Clear them so the change is
      // a real all-devices logout, then mint a fresh pair for the device
      // that initiated the change so it stays signed in.
      await tokens.revokeAllSessions(request.user.id);
      const pair = await tokens.createSession(
        request.user.id,
        !!request.user.isAdmin
      );
      return pair;
    }
  );
};

export default { init, plugin };
