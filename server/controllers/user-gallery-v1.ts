import { Type } from "typebox";
import { type FastifyPluginAsyncTypebox } from "@fastify/type-provider-typebox";

import CONST from "../lib/constants.js";
import authorizerFactory from "../lib/authorizer.js";
import { StringEnum } from "../lib/schema-utils.js";
import modelFactory from "../models/user-gallery.js";

const authorizer = authorizerFactory();
const model = modelFactory();

const init = async () => {
  await model.init();
};

const FilterQuery = Type.Object({
  userId: Type.Optional(Type.String()),
  galleryId: Type.Optional(Type.String()),
});
const RowParams = Type.Object({
  userId: Type.String(),
  galleryId: Type.String(),
});
const RowResponse = Type.Object({
  user_id: Type.String(),
  gallery_id: Type.String(),
  access_level: Type.Number(),
  hide_map: Type.Union([Type.Number(), Type.Null()]),
});
const RowsResponse = Type.Array(RowResponse);
// `none|view|admin` maps to the numeric ACCESS_* constants. `hideMap`
// is the privacy override on this specific (user, gallery) pair —
// `null` means "inherit from the next outer level".
const AccessLevelLiteral = StringEnum(["none", "view", "admin"] as const);
const UpsertBody = Type.Object(
  {
    accessLevel: AccessLevelLiteral,
    hideMap: Type.Optional(Type.Union([Type.Boolean(), Type.Null()])),
  },
  { additionalProperties: false }
);
const TAGS = ["user-gallery"];

const accessLevelToNumber = (level: "none" | "view" | "admin"): number => {
  switch (level) {
    case "none":
      return CONST.ACCESS_NONE;
    case "view":
      return CONST.ACCESS_VIEW;
    case "admin":
      return CONST.ACCESS_ADMIN;
  }
};

const plugin: FastifyPluginAsyncTypebox = async (fastify) => {
  /**
   * List user_gallery rows (admin only). Optional `userId` / `galleryId`
   * filters narrow the set.
   */
  fastify.get(
    "/",
    {
      schema: {
        tags: TAGS,
        summary: "List user_gallery ACL rows (admin)",
        querystring: FilterQuery,
        response: { 200: RowsResponse },
        security: [{ bearer: [] }],
      },
    },
    async (request) => {
      await authorizer.authorizeAdmin(request.user.id);
      const rows = await model.getUserGalleryRows({
        userId: request.query.userId,
        galleryId: request.query.galleryId,
      });
      return rows as Array<{
        user_id: string;
        gallery_id: string;
        access_level: number;
        hide_map: number | null;
      }>;
    }
  );

  /**
   * Upsert one user_gallery row.
   */
  fastify.put(
    "/:userId/:galleryId",
    {
      schema: {
        tags: TAGS,
        summary: "Upsert a user_gallery ACL row (admin)",
        params: RowParams,
        body: UpsertBody,
        security: [{ bearer: [] }],
      },
    },
    async (request, reply) => {
      await authorizer.authorizeAdmin(request.user.id);
      const { accessLevel, hideMap } = request.body;
      await model.upsertUserGallery({
        user_id: request.params.userId,
        gallery_id: request.params.galleryId,
        access_level: accessLevelToNumber(accessLevel),
        hide_map:
          hideMap === undefined ? undefined : hideMap === null ? null : hideMap ? 1 : 0,
      });
      reply.status(204).send();
    }
  );

  /**
   * Delete a user_gallery row. The user's effective access falls back
   * to whatever rule applies at the next outer scope.
   */
  fastify.delete(
    "/:userId/:galleryId",
    {
      schema: {
        tags: TAGS,
        summary: "Delete a user_gallery ACL row (admin)",
        params: RowParams,
        security: [{ bearer: [] }],
      },
    },
    async (request, reply) => {
      await authorizer.authorizeAdmin(request.user.id);
      await model.deleteUserGallery(
        request.params.userId,
        request.params.galleryId
      );
      reply.status(204).send();
    }
  );
};

export default { init, plugin };
