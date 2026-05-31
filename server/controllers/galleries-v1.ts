import { Type } from "typebox";
import { type FastifyPluginAsyncTypebox } from "@fastify/type-provider-typebox";

import authorizerFactory from "../lib/authorizer.js";
import { AccessError, NotFoundError } from "../lib/errors.js";
import {
  GALLERY_EPOCH_TYPES,
  GALLERY_INITIAL_VIEWS,
  GALLERY_THEMES,
} from "../lib/gallery-fields.js";
import { shouldHideMap, maskCoordinates } from "../lib/privacy.js";
import { StringEnum } from "../lib/schema-utils.js";
import modelFactory from "../models/gallery.js";

const authorizer = authorizerFactory();
const model = modelFactory();

const init = async () => {
  await model.init();
};

const GalleryIdParam = Type.Object({ galleryId: Type.String() });
// Schema pins the two fields we care about; extras (title, theme,
// hostname, photos, …) pass through to the client.
const GalleryListItem = Type.Object(
  { id: Type.String(), hideMap: Type.Boolean() },
  { additionalProperties: true }
);
const GalleryListResponse = Type.Array(GalleryListItem);
const GalleryItemResponse = Type.Object(
  { id: Type.String(), hideMap: Type.Boolean() },
  { additionalProperties: true }
);
// camelCase to match the Gallery model shape (`epochType`, `initialView`).
// All non-id fields optional; PUT body drops `id` since it comes from
// the URL.
const GalleryFields = {
  title: Type.Optional(Type.String()),
  description: Type.Optional(Type.String()),
  icon: Type.Optional(Type.String()),
  epoch: Type.Optional(Type.String()),
  epochType: Type.Optional(StringEnum(GALLERY_EPOCH_TYPES)),
  theme: Type.Optional(StringEnum(GALLERY_THEMES)),
  initialView: Type.Optional(StringEnum(GALLERY_INITIAL_VIEWS)),
  hostname: Type.Optional(Type.String()),
};
const GalleryCreateBody = Type.Object({
  id: Type.String({ minLength: 1 }),
  ...GalleryFields,
});
const GalleryUpdateBody = Type.Object(GalleryFields);
const TAGS = ["galleries"];

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

const plugin: FastifyPluginAsyncTypebox = async (fastify) => {
  /**
   * Get all galleries (admin sees all; guests/users see what they can view).
   */
  fastify.get(
    "/",
    {
      schema: {
        tags: TAGS,
        summary: "List galleries visible to the requester",
        response: { 200: GalleryListResponse },
      },
    },
    async (request) => {
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
    }
  );

  /**
   * Create a new gallery.
   */
  fastify.post(
    "/",
    {
      schema: {
        tags: TAGS,
        summary: "Create a gallery (admin)",
        body: GalleryCreateBody,
        security: [{ bearer: [] }],
      },
    },
    async (request, reply) => {
      await authorizer.authorizeAdmin(request.user.id);
      await model.createGallery(request.body);
      reply.status(201).send();
    }
  );

  /**
   * Get a single gallery, including its photos.
   */
  fastify.get(
    "/:galleryId",
    {
      schema: {
        tags: TAGS,
        summary: "Get one gallery (with photos)",
        params: GalleryIdParam,
        response: { 200: GalleryItemResponse },
      },
    },
    async (request) => {
      // Same empty payload for "no access" and "no such gallery" so
      // a walk of IDs can't enumerate which exist.
      try {
        await authorizer.authorizeGalleryView(
          request.user.id,
          request.params.galleryId
        );
        const gallery = (await model.getGallery(
          request.params.galleryId
        )) as Record<string, unknown> & { id: string; photos?: unknown[] };
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
      } catch (error) {
        if (error instanceof AccessError || error instanceof NotFoundError) {
          return { id: request.params.galleryId, hideMap: false };
        }
        throw error;
      }
    }
  );

  /**
   * Update gallery properties.
   */
  fastify.put(
    "/:galleryId",
    {
      schema: {
        tags: TAGS,
        summary: "Update gallery properties (admin)",
        params: GalleryIdParam,
        body: GalleryUpdateBody,
        security: [{ bearer: [] }],
      },
    },
    async (request, reply) => {
      await authorizer.authorizeGalleryAdmin(
        request.user.id,
        request.params.galleryId
      );
      await model.updateGallery(request.params.galleryId, request.body);
      reply.status(204).send();
    }
  );

  /**
   * Delete a gallery.
   */
  fastify.delete(
    "/:galleryId",
    {
      schema: {
        tags: TAGS,
        summary: "Delete a gallery (admin)",
        params: GalleryIdParam,
        security: [{ bearer: [] }],
      },
    },
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
