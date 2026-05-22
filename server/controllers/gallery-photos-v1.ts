import type { FastifyPluginAsync } from "fastify";

import authorizerFactory from "../lib/authorizer.js";
import { shouldHideMap, maskCoordinates } from "../lib/privacy.js";
import modelFactory from "../models/gallery-photo.js";

const authorizer = authorizerFactory();
const model = modelFactory();

const init = async () => {
  await model.init();
};

const plugin: FastifyPluginAsync = async (fastify) => {
  /**
   * Get all photos in the gallery.
   */
  fastify.get<{ Params: { galleryId: string } }>(
    "/:galleryId/",
    async (request) => {
      await authorizer.authorizeGalleryView(
        request.user.id,
        request.params.galleryId
      );
      const photos = await model.getGalleryPhotos(request.params.galleryId);
      if (await shouldHideMap(request.user.id, request.params.galleryId)) {
        maskCoordinates(photos as Parameters<typeof maskCoordinates>[0]);
      }
      return photos;
    }
  );

  /**
   * Get the properties of a photo in gallery context.
   */
  fastify.get<{ Params: { galleryId: string; photoId: string } }>(
    "/:galleryId/:photoId",
    async (request) => {
      await authorizer.authorizeGalleryView(
        request.user.id,
        request.params.galleryId
      );
      const photo = await model.getGalleryPhoto(
        request.params.galleryId,
        request.params.photoId
      );
      if (await shouldHideMap(request.user.id, request.params.galleryId)) {
        maskCoordinates([photo] as Parameters<typeof maskCoordinates>[0]);
      }
      return photo;
    }
  );

  /**
   * Link a photo to a gallery.
   */
  fastify.put<{ Params: { galleryId: string; photoId: string } }>(
    "/:galleryId/:photoId",
    async (request, reply) => {
      await authorizer.authorizeGalleryAdmin(
        request.user.id,
        request.params.galleryId
      );
      await model.linkGalleryPhoto(
        request.params.galleryId,
        request.params.photoId
      );
      reply.status(204).send();
    }
  );

  /**
   * Unlink a photo from a gallery.
   */
  fastify.delete<{ Params: { galleryId: string; photoId: string } }>(
    "/:galleryId/:photoId",
    async (request, reply) => {
      await authorizer.authorizeGalleryAdmin(
        request.user.id,
        request.params.galleryId
      );
      await model.unlinkGalleryPhoto(
        request.params.galleryId,
        request.params.photoId
      );
      reply.status(204).send();
    }
  );
};

export default { init, plugin };
