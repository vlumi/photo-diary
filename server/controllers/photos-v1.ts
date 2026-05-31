import { Type } from "typebox";
import { type FastifyPluginAsyncTypebox } from "@fastify/type-provider-typebox";

import CONST from "../lib/constants.js";
import authorizerFactory from "../lib/authorizer.js";
import {
  requirePhotoInScope,
  requireUnscoped,
} from "../lib/host-scope.js";
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
//
// Body shape is restricted to the override fields `bin/photo.ts`
// already exposes (title, description, author, country, place, gear,
// focal, aperture). EXIF-derived fields (timestamps, coordinates,
// dimensions, ISO, shutter, the 35mm-equiv, serials) and Nominatim-
// derived `geocoded.*` are intentionally NOT writable — they're
// owned by the converter / photo-geocode daemon. `additionalProperties:
// false` at each nested level rejects unknown writes with 400.
const PhotoOverridesFields = {
  title: Type.Optional(Type.String()),
  description: Type.Optional(Type.String()),
  taken: Type.Optional(
    Type.Object(
      {
        author: Type.Optional(Type.String()),
        location: Type.Optional(
          Type.Object(
            {
              country: Type.Optional(Type.String()),
              place: Type.Optional(Type.String()),
            },
            { additionalProperties: false }
          )
        ),
      },
      { additionalProperties: false }
    )
  ),
  camera: Type.Optional(
    Type.Object(
      {
        make: Type.Optional(Type.String()),
        model: Type.Optional(Type.String()),
      },
      { additionalProperties: false }
    )
  ),
  lens: Type.Optional(
    Type.Object(
      {
        make: Type.Optional(Type.String()),
        model: Type.Optional(Type.String()),
      },
      { additionalProperties: false }
    )
  ),
  exposure: Type.Optional(
    Type.Object(
      {
        focalLength: Type.Optional(Type.Number()),
        aperture: Type.Optional(Type.Number()),
      },
      { additionalProperties: false }
    )
  ),
};
const PhotoCreateBody = Type.Object(
  {
    id: Type.String({ minLength: 1 }),
    ...PhotoOverridesFields,
  },
  { additionalProperties: false }
);
const PhotoUpdateBody = Type.Object(PhotoOverridesFields, {
  additionalProperties: false,
});
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
        body: PhotoCreateBody,
        security: [{ bearer: [] }],
      },
    },
    async (request, reply) => {
      requireUnscoped(request);
      await authorizer.authorizeAdmin(request.user.id);
      await model.createPhoto(
        request.body as { id: string } & Record<string, unknown>
      );
      reply.status(201).send();
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
        body: PhotoUpdateBody,
        security: [{ bearer: [] }],
      },
    },
    async (request, reply) => {
      await requirePhotoInScope(request, request.params.photoId);
      await authorizer.authorizeAdmin(request.user.id);
      await model.updatePhoto(
        request.params.photoId,
        request.body as Record<string, unknown>
      );
      reply.status(204).send();
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
      await requirePhotoInScope(request, request.params.photoId);
      await authorizer.authorizeAdmin(request.user.id);
      await model.deletePhoto(request.params.photoId);
      reply.status(204).send();
    }
  );
};

export default { init, plugin };
