import { Type } from "@sinclair/typebox";
import { type FastifyPluginAsyncTypebox } from "@fastify/type-provider-typebox";

import authorizerFactory from "../lib/authorizer.js";
import modelFactory from "../models/user.js";

const authorizer = authorizerFactory();
const model = modelFactory();

const init = async () => {
  await model.init();
};

const UserIdParam = Type.Object({ userId: Type.String() });

const plugin: FastifyPluginAsyncTypebox = async (fastify) => {
  /**
   * Get all users.
   */
  fastify.get("/", async (request) => {
    await authorizer.authorizeAdmin(request.user.id);
    const cleanUser = (user: { id: string }) => ({ id: user.id });
    const users = (await model.getUsers()) as Array<{ id: string }>;
    return users.map(cleanUser);
  });

  /**
   * Create a user.
   */
  fastify.post("/", async (request) => {
    await authorizer.authorizeAdmin(request.user.id);
    const user = {};
    // TODO: validate and set content from request.body
    return await model.createUser(user);
  });

  /**
   * Get the matching user.
   */
  fastify.get(
    "/:userId",
    { schema: { params: UserIdParam } },
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
    { schema: { params: UserIdParam } },
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
    { schema: { params: UserIdParam } },
    async (request, reply) => {
      await authorizer.authorizeAdmin(request.user.id);
      await model.deleteUser(request.params.userId);
      reply.status(204).send();
    }
  );
};

export default { init, plugin };
