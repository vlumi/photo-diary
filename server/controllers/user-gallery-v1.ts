import { Type } from "typebox";
import { type FastifyPluginAsyncTypebox } from "@fastify/type-provider-typebox";

import authorizerFactory from "../lib/authorizer.js";
import { requireScopeMatches } from "../lib/host-scope.js";
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
  userId: Type.String({ minLength: 1 }),
  galleryId: Type.String({ minLength: 1 }),
});
const RowResponse = Type.Object({
  user_id: Type.String(),
  gallery_id: Type.String(),
  is_editor: Type.Number(),
  hide_map: Type.Union([Type.Number(), Type.Null()]),
  can_see_private: Type.Number(),
});
const RowsResponse = Type.Array(RowResponse);
// `isEditor = true` upgrades a row to gallery editor. `hideMap`
// is the privacy override on this specific (user, gallery) pair —
// `null` means "inherit from the next outer level." `canSeePrivate`
// extends view-only rows to the gallery's private-flagged photos
// (editors / admins always see private regardless).
const UpsertBody = Type.Object(
  {
    isEditor: Type.Boolean(),
    hideMap: Type.Optional(Type.Union([Type.Boolean(), Type.Null()])),
    canSeePrivate: Type.Optional(Type.Boolean()),
  },
  { additionalProperties: false }
);
const TAGS = ["user-gallery"];

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
      const rows = (await model.getUserGalleryRows({
        userId: request.query.userId,
        galleryId: request.query.galleryId,
      })) as Array<{
        user_id: string;
        gallery_id: string;
        is_editor: number;
        hide_map: number | null;
        can_see_private: number;
      }>;
      // On a scoped host, narrow to the scoped galleries. Rows for any
      // other gallery are simply not visible from this hostname.
      const scope = request.galleryScope ?? [];
      return scope.length > 0
        ? rows.filter((row) => scope.includes(row.gallery_id))
        : rows;
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
      requireScopeMatches(request, request.params.galleryId);
      await authorizer.authorizeAdmin(request.user.id);
      const { isEditor, hideMap, canSeePrivate } = request.body;
      await model.upsertUserGallery({
        user_id: request.params.userId,
        gallery_id: request.params.galleryId,
        is_editor: isEditor,
        hide_map:
          hideMap === undefined ? undefined : hideMap === null ? null : hideMap ? 1 : 0,
        can_see_private: canSeePrivate,
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
      requireScopeMatches(request, request.params.galleryId);
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
