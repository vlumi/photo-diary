import { Type } from "typebox";
import { type FastifyPluginAsyncTypebox } from "@fastify/type-provider-typebox";

import CONST from "../lib/constants.js";
import authorizerFactory from "../lib/authorizer.js";
import { shouldHideMap, maskCoordinates } from "../lib/privacy.js";
import modelFactory from "../models/photo.js";

const authorizer = authorizerFactory();
const model = modelFactory();

const init = async () => {
  await model.init();
};

const PhotoIdParam = Type.Object({ photoId: Type.String() });
// No response schemas here — these routes aren't consumed by the
// SPA (which uses `/api/v1/gallery-photos/:galleryId`).
const TAGS = ["photos"];

const plugin: FastifyPluginAsyncTypebox = async (fastify) => {
  /**
   * Get all photos.
   */
  fastify.get(
    "/",
    { schema: { tags: TAGS, summary: "List all photos" } },
    async (request) => {
      await authorizer.authorizeView(request.user.id);
      const photos = await model.getPhotos();
      // No per-gallery scope — use the :all-level preference.
      // `Object.values` works for both driver shapes (sqlite array,
      // dummy dict).
      if (await shouldHideMap(request.user.id, CONST.SPECIAL_GALLERY_ALL)) {
        maskCoordinates(
        Object.values(photos as Record<string, unknown>) as Parameters<
          typeof maskCoordinates
        >[0]
        );
      }
      return photos;
    }
  );

  /**
   * Create a photo.
   */
  fastify.post(
    "/",
    {
      schema: {
        tags: TAGS,
        summary: "Create a photo (admin)",
        security: [{ bearer: [] }],
      },
    },
    async (request) => {
      await authorizer.authorizeAdmin(request.user.id);
      const photo = {};
      // TODO: validate and set content from request.body
      return await model.createPhoto(photo);
    }
  );

  /**
   * Get the matching photo.
   */
  fastify.get(
    "/:photoId",
    {
      schema: {
        tags: TAGS,
        summary: "Get one photo by id",
        params: PhotoIdParam,
      },
    },
    async (request) => {
      await authorizer.authorizeView(request.user.id);
      const photo = await model.getPhoto(request.params.photoId);
      if (await shouldHideMap(request.user.id, CONST.SPECIAL_GALLERY_ALL)) {
        maskCoordinates([photo] as Parameters<typeof maskCoordinates>[0]);
      }
      return photo;
    }
  );

  /**
   * Update the matching photo.
   */
  fastify.put(
    "/:photoId",
    {
      schema: {
        tags: TAGS,
        summary: "Update one photo (admin)",
        params: PhotoIdParam,
        security: [{ bearer: [] }],
      },
    },
    async (request) => {
      await authorizer.authorizeAdmin(request.user.id);
      const photo = {};
      // TODO: validate and set content from request.body
      return await model.updatePhoto(photo);
    }
  );

  /**
   * Delete the matching photo.
   */
  fastify.delete(
    "/:photoId",
    {
      schema: {
        tags: TAGS,
        summary: "Delete one photo (admin)",
        params: PhotoIdParam,
        security: [{ bearer: [] }],
      },
    },
    async (request, reply) => {
      await authorizer.authorizeAdmin(request.user.id);
      await model.deletePhoto(request.params.photoId);
      reply.status(204).send();
    }
  );
};

export default { init, plugin };
