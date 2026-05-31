import { Type } from "typebox";
import { type FastifyPluginAsyncTypebox } from "@fastify/type-provider-typebox";

import authorizerFactory from "../lib/authorizer.js";
import { AccessError, NotFoundError } from "../lib/errors.js";
import { requireScopeMatches } from "../lib/host-scope.js";
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
// Picks the geocoded place / state / city / district from photo_localized
// when set; falls back to the EN canonical on the photo row.
const LangQuery = Type.Object({
  lang: Type.Optional(Type.String()),
});
// Permissive — joined photo metadata, wider than the contract.
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
        querystring: LangQuery,
        response: { 200: GalleryPhotosListResponse },
      },
    },
    async (request) => {
      // Both "no access" and "no such gallery" → empty array, so
      // gallery existence can't be enumerated. On a scoped host an
      // off-scope gallery joins the same bucket. See galleries-v1.ts.
      try {
        requireScopeMatches(request, request.params.galleryId);
        await authorizer.authorizeGalleryView(
          request.user.id,
          request.params.galleryId
        );
        const photos = await model.getGalleryPhotos(
          request.params.galleryId,
          request.query.lang
        );
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
        querystring: LangQuery,
        response: { 200: PhotoItem },
      },
    },
    async (request) => {
      // Uniform 404 for both "no access" and "no such photo".
      // Off-scope gallery on a scoped host → same 404.
      try {
        requireScopeMatches(request, request.params.galleryId);
        await authorizer.authorizeGalleryView(
          request.user.id,
          request.params.galleryId
        );
        const photo = await model.getGalleryPhoto(
          request.params.galleryId,
          request.params.photoId,
          request.query.lang
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
      requireScopeMatches(request, request.params.galleryId);
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
      requireScopeMatches(request, request.params.galleryId);
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
