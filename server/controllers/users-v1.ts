import { Type } from "typebox";
import { type FastifyPluginAsyncTypebox } from "@fastify/type-provider-typebox";

import authorizerFactory from "../lib/authorizer.js";
import modelFactory from "../models/user.js";

const authorizer = authorizerFactory();
const model = modelFactory();

const init = async () => {
  await model.init();
};

const UserIdParam = Type.Object({ userId: Type.String() });
const UserSummary = Type.Object({ id: Type.String() });
const UsersListResponse = Type.Array(UserSummary);
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
        security: [{ bearer: [] }],
      },
    },
    async (request) => {
      await authorizer.authorizeAdmin(request.user.id);
      const user = {};
      // TODO: validate and set content from request.body
      return await model.createUser(user);
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
        security: [{ bearer: [] }],
      },
    },
    async (request) => {
      await authorizer.authorizeAdmin(request.user.id);
      const user = {};
      // TODO: validate and set content from request.body
      return await model.updateUser(user);
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
      await authorizer.authorizeAdmin(request.user.id);
      await model.deleteUser(request.params.userId);
      reply.status(204).send();
    }
  );
};

export default { init, plugin };
