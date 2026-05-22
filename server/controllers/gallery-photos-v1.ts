import { Type } from "@sinclair/typebox";
import { type FastifyPluginAsyncTypebox } from "@fastify/type-provider-typebox";

import authorizerFactory from "../lib/authorizer.js";
import { shouldHideMap, maskCoordinates } from "../lib/privacy.js";
import modelFactory from "../models/gallery-photo.js";

const authorizer = authorizerFactory();
const model = modelFactory();

const init = async () => {
  await model.init();
};

const GalleryIdParam = Type.Object({ galleryId: Type.String() });
const GalleryPhotoParams = Type.Object({
  galleryId: Type.String(),
  photoId: Type.String(),
});
const TAGS = ["gallery-photos"];

const plugin: FastifyPluginAsyncTypebox = async (fastify) => {
  /**
   * Get all photos in the gallery.
   */
  fastify.get(
    "/:galleryId",
    {
      schema: {
        tags: TAGS,
        summary: "List photos in a gallery",
        params: GalleryIdParam,
      },
    },
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
  fastify.get(
    "/:galleryId/:photoId",
    {
      schema: {
        tags: TAGS,
        summary: "Get one photo's metadata in a gallery's context",
        params: GalleryPhotoParams,
      },
    },
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
  fastify.put(
    "/:galleryId/:photoId",
    {
      schema: {
        tags: TAGS,
        summary: "Link a photo to a gallery (admin)",
        params: GalleryPhotoParams,
      },
    },
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
  fastify.delete(
    "/:galleryId/:photoId",
    {
      schema: {
        tags: TAGS,
        summary: "Unlink a photo from a gallery (admin)",
        params: GalleryPhotoParams,
      },
    },
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
