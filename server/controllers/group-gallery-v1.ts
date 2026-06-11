import { Type } from "typebox";
import { type FastifyPluginAsyncTypebox } from "@fastify/type-provider-typebox";

import authorizerFactory from "../lib/authorizer.js";
import { requireScopeMatches } from "../lib/host-scope.js";
import { BooleanOrNull } from "../lib/schema-utils.js";
import modelFactory from "../models/group-gallery.js";

const authorizer = authorizerFactory();
const model = modelFactory();

const init = async () => {
  await model.init();
};

const FilterQuery = Type.Object({
  groupId: Type.Optional(Type.String()),
  galleryId: Type.Optional(Type.String()),
});
const RowParams = Type.Object({
  groupId: Type.String({ minLength: 1 }),
  galleryId: Type.String({ minLength: 1 }),
});
const RowResponse = Type.Object({
  group_id: Type.String(),
  gallery_id: Type.String(),
  is_editor: Type.Number(),
  hide_map: Type.Union([Type.Number(), Type.Null()]),
});
const RowsResponse = Type.Array(RowResponse);
// Mirror of /user-gallery body. Row presence grants view; isEditor
// upgrades to gallery admin. `hideMap` is the privacy override at the
// group layer.
const UpsertBody = Type.Object(
  {
    isEditor: Type.Boolean(),
    hideMap: Type.Optional(BooleanOrNull()),
  },
  { additionalProperties: false }
);
const TAGS = ["group-gallery"];

const plugin: FastifyPluginAsyncTypebox = async (fastify) => {
  fastify.get(
    "/",
    {
      schema: {
        tags: TAGS,
        summary: "List group_gallery ACL rows (admin)",
        querystring: FilterQuery,
        response: { 200: RowsResponse },
        security: [{ bearer: [] }],
      },
    },
    async (request) => {
      await authorizer.authorizeAdmin(request.user.id);
      const rows = (await model.getGroupGalleryRows({
        groupId: request.query.groupId,
        galleryId: request.query.galleryId,
      })) as Array<{
        group_id: string;
        gallery_id: string;
        is_editor: number;
        hide_map: number | null;
      }>;
      const scope = request.galleryScope ?? [];
      return scope.length > 0
        ? rows.filter((row) => scope.includes(row.gallery_id))
        : rows;
    }
  );

  fastify.put(
    "/:groupId/:galleryId",
    {
      schema: {
        tags: TAGS,
        summary: "Upsert a group_gallery ACL row (admin)",
        params: RowParams,
        body: UpsertBody,
        security: [{ bearer: [] }],
      },
    },
    async (request, reply) => {
      requireScopeMatches(request, request.params.galleryId);
      await authorizer.authorizeAdmin(request.user.id);
      const { isEditor, hideMap } = request.body;
      await model.upsertGroupGallery({
        group_id: request.params.groupId,
        gallery_id: request.params.galleryId,
        is_editor: isEditor,
        hide_map:
          hideMap === undefined ? undefined : hideMap === null ? null : hideMap ? 1 : 0,
      });
      reply.status(204).send();
    }
  );

  fastify.delete(
    "/:groupId/:galleryId",
    {
      schema: {
        tags: TAGS,
        summary: "Delete a group_gallery ACL row (admin)",
        params: RowParams,
        security: [{ bearer: [] }],
      },
    },
    async (request, reply) => {
      requireScopeMatches(request, request.params.galleryId);
      await authorizer.authorizeAdmin(request.user.id);
      await model.deleteGroupGallery(
        request.params.groupId,
        request.params.galleryId
      );
      reply.status(204).send();
    }
  );
};

export default { init, plugin };
