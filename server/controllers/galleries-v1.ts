import type { FastifyPluginAsync } from "fastify";

import authorizerFactory from "../lib/authorizer.js";
import { shouldHideMap, maskCoordinates } from "../lib/privacy.js";
import modelFactory from "../models/gallery.js";

const authorizer = authorizerFactory();
const model = modelFactory();

const init = async () => {
  await model.init();
};

const annotateWithHideMap = async (
  userId: string,
  galleries: Array<{ id: string }>
): Promise<Array<{ id: string; hideMap: boolean }>> =>
  Promise.all(
    galleries.map(async (gallery) => ({
      ...gallery,
      hideMap: await shouldHideMap(userId, gallery.id),
    }))
  );

const plugin: FastifyPluginAsync = async (fastify) => {
  /**
   * Get all galleries (admin sees all; guests/users see what they can view).
   */
  fastify.get("/", async (request) => {
    const galleries = (await model.getGalleries()) as Array<{ id: string }>;
    try {
      await authorizer.authorizeAdmin(request.user.id);
      return await annotateWithHideMap(request.user.id, galleries);
    } catch {
      const galleryIds = galleries.map((gallery) => gallery.id);
      const authorizedPromises = await Promise.allSettled(
        galleryIds.map((galleryId) =>
          authorizer.authorizeGalleryView(request.user.id, galleryId)
        )
      );
      const authorizedGalleryIds = authorizedPromises
        .filter((result) => result.status === "fulfilled")
        .map((result) => result.value);
      const authorizedGalleries = galleries.filter((gallery) =>
        authorizedGalleryIds.includes(gallery.id)
      );
      return await annotateWithHideMap(request.user.id, authorizedGalleries);
    }
  });

  /**
   * Create a new gallery.
   */
  fastify.post("/", async (request) => {
    await authorizer.authorizeAdmin(request.user.id);
    const gallery = {};
    // TODO: validate and set content from request.body
    return await model.createGallery(gallery);
  });

  /**
   * Get a single gallery, including its photos.
   */
  fastify.get<{ Params: { galleryId: string } }>(
    "/:galleryId",
    async (request) => {
      await authorizer.authorizeGalleryView(
        request.user.id,
        request.params.galleryId
      );
      const gallery = (await model.getGallery(
        request.params.galleryId
      )) as Record<string, unknown> & { photos?: unknown[] };
      const hideMap = await shouldHideMap(
        request.user.id,
        request.params.galleryId
      );
      if (hideMap && gallery.photos) {
        maskCoordinates(
          gallery.photos as Parameters<typeof maskCoordinates>[0]
        );
      }
      return { ...gallery, hideMap };
    }
  );

  /**
   * Update gallery properties.
   */
  fastify.put<{ Params: { galleryId: string } }>(
    "/:galleryId",
    async (request) => {
      await authorizer.authorizeGalleryAdmin(
        request.user.id,
        request.params.galleryId
      );
      const gallery = {};
      // TODO: validate and set content from request.body
      return await model.updateGallery(gallery);
    }
  );

  /**
   * Delete a gallery.
   */
  fastify.delete<{ Params: { galleryId: string } }>(
    "/:galleryId",
    async (request, reply) => {
      await authorizer.authorizeGalleryAdmin(
        request.user.id,
        request.params.galleryId
      );
      await model.deleteGallery(request.params.galleryId);
      reply.status(204).send();
    }
  );
};

export default { init, plugin };
