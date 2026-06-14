import { Type } from "typebox";
import { type FastifyPluginAsyncTypebox } from "@fastify/type-provider-typebox";

import authorizerFactory from "../lib/authorizer.js";
import { AccessError, NotFoundError } from "../lib/errors.js";
import {
  GALLERY_EPOCH_TYPES,
  GALLERY_INITIAL_VIEWS,
  GALLERY_THEMES,
} from "../lib/gallery-fields.js";
import {
  requireScopeMatches,
  requireUnscoped,
} from "../lib/host-scope.js";
import { ID_PATTERN_SOURCE } from "../lib/id-shape.js";
import { shouldHideMap, maskCoordinates } from "../lib/privacy.js";
import { StringEnum } from "../lib/schema-utils.js";
import modelFactory from "../models/gallery.js";

const authorizer = authorizerFactory();
const model = modelFactory();

const init = async () => {
  await model.init();
};

const GalleryIdParam = Type.Object({ galleryId: Type.String() });
const GalleryIconBody = Type.Object({
  sourcePhotoId: Type.String({ minLength: 1 }),
  sourceMaxDim: Type.Integer({ exclusiveMinimum: 0 }),
  crop: Type.Object({
    x: Type.Number({ minimum: 0 }),
    y: Type.Number({ minimum: 0 }),
    width: Type.Number({ exclusiveMinimum: 0 }),
    height: Type.Number({ exclusiveMinimum: 0 }),
  }),
});
const GalleryIconResponse = Type.Object({ icon: Type.String() });
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
// Per-language overlay map. Keyed by lang code, values are strings;
// empty string clears the overlay row column.
const LocalizedMap = Type.Record(Type.String(), Type.String());
// camelCase to match the Gallery model shape (`epochType`, `initialView`).
// All non-id fields optional; PUT body drops `id` since it comes from
// the URL.
const GalleryFields = {
  title: Type.Optional(Type.String()),
  description: Type.Optional(Type.String()),
  titleLocalized: Type.Optional(LocalizedMap),
  descriptionLocalized: Type.Optional(LocalizedMap),
  // Operator-set primary language for the canonical title /
  // description. Changing this triggers the canonical/overlay
  // shuffle in the model layer (see `shuffleDefaultLanguage`):
  // old canonical → old-default's overlay slot; new default's
  // overlay → canonical; drop the new default's overlay row.
  // Omitted on create → server uses `.env DEFAULT_LANGUAGE` or
  // falls through to `en`.
  defaultLanguage: Type.Optional(Type.String({ minLength: 1 })),
  icon: Type.Optional(Type.String()),
  epoch: Type.Optional(Type.String()),
  epochType: Type.Optional(StringEnum(GALLERY_EPOCH_TYPES)),
  theme: Type.Optional(StringEnum(GALLERY_THEMES)),
  initialView: Type.Optional(StringEnum(GALLERY_INITIAL_VIEWS)),
  hostname: Type.Optional(Type.String()),
  // Virtual gallery (#22): non-empty array makes the gallery a
  // virtual union of the listed source galleries; empty array
  // turns a virtual gallery back into a real one (drops the
  // virtual_gallery row); omitted leaves the type unchanged.
  // Validation in the model layer (no self-reference, no chained
  // virtual sources, every id must exist).
  sources: Type.Optional(Type.Array(Type.String({ minLength: 1 }))),
};
const GalleryCreateBody = Type.Object({
  id: Type.String({ minLength: 1, pattern: ID_PATTERN_SOURCE }),
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
      const allGalleries = (await model.getGalleries()) as Array<{
        id: string;
      }>;
      // On a scoped host the list is narrowed to galleries reachable
      // from that hostname before any access check — even cross-gallery
      // viewers shouldn't enumerate the rest of the instance via this
      // entry point.
      const scope = request.galleryScope ?? [];
      const galleries =
        scope.length > 0
          ? allGalleries.filter((gallery) => scope.includes(gallery.id))
          : allGalleries;
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
   * Apply operator-curated gallery sort order (#585). Body is an
   * ordered list of gallery ids covering exactly the current
   * gallery set. Admin-only. Underscore-prefix path keeps the
   * literal segment off the slug-id namespace (`assertSlugId`
   * rejects ids starting with anything other than [a-z0-9]).
   */
  fastify.post(
    "/_order",
    {
      schema: {
        tags: TAGS,
        summary: "Reorder galleries (admin)",
        body: Type.Object(
          { ids: Type.Array(Type.String({ minLength: 1 })) },
          { additionalProperties: false }
        ),
        security: [{ bearer: [] }],
      },
    },
    async (request, reply) => {
      await authorizer.authorizeAdmin(request.user.id);
      await model.setGalleryOrder(request.body.ids);
      reply.status(204).send();
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
      requireUnscoped(request);
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
      // a walk of IDs can't enumerate which exist. On a scoped host
      // an off-scope id falls into the same bucket — the gallery is
      // unreachable from this hostname.
      try {
        requireScopeMatches(request, request.params.galleryId);
        await authorizer.authorizeGalleryView(
          request.user.id,
          request.params.galleryId
        );
        const includePrivate = await authorizer.resolveCanSeePrivate(
          request.user.id,
          request.params.galleryId
        );
        const gallery = (await model.getGallery(
          request.params.galleryId,
          includePrivate
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
      requireScopeMatches(request, request.params.galleryId);
      await authorizer.authorizeGalleryEditor(
        request.user.id,
        request.params.galleryId
      );
      // Hostname is an instance-level concern (routes traffic to
      // this gallery), not curation — gallery-editors can't set
      // it. Global admins pass the editor check trivially and
      // bypass this gate.
      if (
        request.body.hostname !== undefined &&
        !request.user.isAdmin
      ) {
        throw new AccessError(undefined, {
          userId: request.user.id,
          required: "global admin",
          field: "hostname",
        });
      }
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
      requireUnscoped(request);
      await authorizer.authorizeAdmin(request.user.id);
      await model.deleteGallery(request.params.galleryId);
      reply.status(204).send();
    }
  );

  /**
   * Crop a photo's display variant into a square gallery icon and
   * stash the source + crop on the gallery row so the cropper can
   * reopen against the same rect.
   */
  fastify.put(
    "/:galleryId/icon",
    {
      schema: {
        tags: TAGS,
        summary: "Set gallery icon from a photo crop (gallery admin)",
        params: GalleryIdParam,
        body: GalleryIconBody,
        response: { 200: GalleryIconResponse },
        security: [{ bearer: [] }],
      },
    },
    async (request) => {
      requireScopeMatches(request, request.params.galleryId);
      await authorizer.authorizeGalleryEditor(
        request.user.id,
        request.params.galleryId
      );
      const icon = await model.setGalleryIcon(
        request.params.galleryId,
        request.body.sourcePhotoId,
        request.body.crop,
        request.body.sourceMaxDim
      );
      return { icon };
    }
  );
};

export default { init, plugin };
