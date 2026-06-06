import { Type } from "typebox";
import { type FastifyPluginAsyncTypebox } from "@fastify/type-provider-typebox";

import authorizerFactory from "../lib/authorizer.js";
import { requireUnscoped } from "../lib/host-scope.js";
import { ID_PATTERN_SOURCE } from "../lib/id-shape.js";
import modelFactory from "../models/group.js";

const authorizer = authorizerFactory();
const model = modelFactory();

const init = async () => {
  await model.init();
};

// Group ids follow the slug shape from `lib/id-shape.ts`. Used
// here as both the create-body validator and the path-param shape,
// so a hand-crafted URL like `/api/v1/groups/-bad` fails fast at
// the schema layer.
const GroupId = Type.String({
  minLength: 1,
  pattern: ID_PATTERN_SOURCE,
});
const GroupIdParam = Type.Object({ groupId: GroupId });
const MemberParams = Type.Object({
  groupId: GroupId,
  userId: Type.String({ minLength: 1 }),
});
const GroupResponse = Type.Object({
  id: Type.String(),
  name: Type.String(),
  description: Type.String(),
});
const GroupsListResponse = Type.Array(GroupResponse);
const GroupCreateBody = Type.Object(
  {
    id: GroupId,
    name: Type.Optional(Type.String()),
    description: Type.Optional(Type.String()),
  },
  { additionalProperties: false }
);
const GroupUpdateBody = Type.Object(
  {
    name: Type.Optional(Type.String()),
    description: Type.Optional(Type.String()),
  },
  { additionalProperties: false }
);
const MemberListResponse = Type.Array(Type.String());
const TAGS = ["groups"];

const plugin: FastifyPluginAsyncTypebox = async (fastify) => {
  fastify.get(
    "/",
    {
      schema: {
        tags: TAGS,
        summary: "List all groups (admin)",
        response: { 200: GroupsListResponse },
        security: [{ bearer: [] }],
      },
    },
    async (request) => {
      await authorizer.authorizeAdmin(request.user.id);
      return await model.getGroups();
    }
  );

  fastify.post(
    "/",
    {
      schema: {
        tags: TAGS,
        summary: "Create a group (admin)",
        body: GroupCreateBody,
        security: [{ bearer: [] }],
      },
    },
    async (request, reply) => {
      requireUnscoped(request);
      await authorizer.authorizeAdmin(request.user.id);
      await model.createGroup(request.body);
      reply.status(201).send();
    }
  );

  fastify.get(
    "/:groupId",
    {
      schema: {
        tags: TAGS,
        summary: "Get one group (admin)",
        params: GroupIdParam,
        response: { 200: GroupResponse },
        security: [{ bearer: [] }],
      },
    },
    async (request) => {
      await authorizer.authorizeAdmin(request.user.id);
      return await model.getGroup(request.params.groupId);
    }
  );

  fastify.put(
    "/:groupId",
    {
      schema: {
        tags: TAGS,
        summary: "Update a group (admin)",
        params: GroupIdParam,
        body: GroupUpdateBody,
        security: [{ bearer: [] }],
      },
    },
    async (request, reply) => {
      requireUnscoped(request);
      await authorizer.authorizeAdmin(request.user.id);
      await model.updateGroup(request.params.groupId, request.body);
      reply.status(204).send();
    }
  );

  fastify.delete(
    "/:groupId",
    {
      schema: {
        tags: TAGS,
        summary: "Delete a group (admin). FK cascade clears memberships and grants.",
        params: GroupIdParam,
        security: [{ bearer: [] }],
      },
    },
    async (request, reply) => {
      requireUnscoped(request);
      await authorizer.authorizeAdmin(request.user.id);
      await model.deleteGroup(request.params.groupId);
      reply.status(204).send();
    }
  );

  fastify.get(
    "/:groupId/members",
    {
      schema: {
        tags: TAGS,
        summary: "List user ids in a group (admin)",
        params: GroupIdParam,
        response: { 200: MemberListResponse },
        security: [{ bearer: [] }],
      },
    },
    async (request) => {
      await authorizer.authorizeAdmin(request.user.id);
      return await model.getMembers(request.params.groupId);
    }
  );

  fastify.put(
    "/:groupId/members/:userId",
    {
      schema: {
        tags: TAGS,
        summary: "Add a user to a group (admin)",
        params: MemberParams,
        security: [{ bearer: [] }],
      },
    },
    async (request, reply) => {
      requireUnscoped(request);
      await authorizer.authorizeAdmin(request.user.id);
      await model.addMember(request.params.userId, request.params.groupId);
      reply.status(204).send();
    }
  );

  fastify.delete(
    "/:groupId/members/:userId",
    {
      schema: {
        tags: TAGS,
        summary: "Remove a user from a group (admin)",
        params: MemberParams,
        security: [{ bearer: [] }],
      },
    },
    async (request, reply) => {
      requireUnscoped(request);
      await authorizer.authorizeAdmin(request.user.id);
      await model.removeMember(request.params.userId, request.params.groupId);
      reply.status(204).send();
    }
  );
};

export default { init, plugin };
