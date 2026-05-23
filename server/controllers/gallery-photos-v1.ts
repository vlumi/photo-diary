import { Type } from "typebox";
import { type FastifyPluginAsyncTypebox } from "@fastify/type-provider-typebox";

import authorizerFactory from "../lib/authorizer.js";
import { AccessError, NotFoundError } from "../lib/errors.js";
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
// Same permissive pattern as the photos controller — these endpoints return
// the joined photo metadata, whose exact shape is wider than the contract
// callers care about.
const PhotoItem = Type.Object({}, { additionalProperties: true });
const GalleryPhotosListResponse = Type.Array(PhotoItem);
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
        response: { 200: GalleryPhotosListResponse },
      },
    },
    async (request) => {
      // Both "no view permission" and "gallery doesn't exist" collapse to
      // an empty array — see the matching note in `galleries-v1.ts` for
      // why the difference would otherwise leak.
      try {
        await authorizer.authorizeGalleryView(
          request.user.id,
          request.params.galleryId
        );
        const photos = await model.getGalleryPhotos(request.params.galleryId);
        if (await shouldHideMap(request.user.id, request.params.galleryId)) {
          maskCoordinates(photos as Parameters<typeof maskCoordinates>[0]);
        }
        return photos;
      } catch (error) {
        if (error instanceof AccessError || error instanceof NotFoundError) {
          return [];
        }
        throw error;
      }
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
        response: { 200: PhotoItem },
      },
    },
    async (request) => {
      // Single-photo lookup uses a uniform 404: gallery-level enumeration
      // is the actual leak the empty-payload trick guards against, and
      // photos aren't enumerable via the LIST surface anyway. So both
      // "no access" and "no such photo" return 404 — converted from
      // `AccessError` to `NotFoundError` here so the wire shape is one.
      try {
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
      } catch (error) {
        if (error instanceof AccessError) {
          throw new NotFoundError();
        }
        throw error;
      }
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
        security: [{ bearer: [] }],
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
        security: [{ bearer: [] }],
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
