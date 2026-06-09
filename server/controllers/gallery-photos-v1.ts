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
const GalleryOriginalFilenameParams = Type.Object({
  galleryId: Type.String(),
  originalFilename: Type.String(),
});
// Picks the geocoded place / state / city / district from photo_localized
// when set; falls back to the EN canonical on the photo row.
const LangQuery = Type.Object({
  lang: Type.Optional(Type.String()),
});
// Permissive — joined photo metadata, wider than the contract.
const PhotoItem = Type.Object({}, { additionalProperties: true });
const GalleryPhotosListResponse = Type.Array(PhotoItem);

// Filter shape mirrors stats-v1.ts — same wire envelope.
// `additionalProperties: true` so the evaluator can drop unknown
// categories instead of rejecting the whole payload.
const FilterKey = Type.Union([
  Type.String(),
  Type.Number(),
  Type.Boolean(),
  Type.Null(),
]);
const FilterCategory = Type.Array(FilterKey);
const FilterTopic = Type.Record(Type.String(), FilterCategory, {
  additionalProperties: true,
});
const FilterSchema = Type.Record(Type.String(), FilterTopic, {
  additionalProperties: true,
});
const QueryBody = Type.Object({
  filter: Type.Optional(FilterSchema),
  year: Type.Optional(Type.Integer({ minimum: 1900, maximum: 9999 })),
  month: Type.Optional(Type.Integer({ minimum: 1, maximum: 12 })),
  day: Type.Optional(Type.Integer({ minimum: 1, maximum: 31 })),
  lang: Type.Optional(Type.String({ minLength: 2, maxLength: 8 })),
});
const CountsBody = Type.Object({
  filter: Type.Optional(FilterSchema),
  year: Type.Optional(Type.Integer({ minimum: 1900, maximum: 9999 })),
});
const CountsResponse = Type.Record(Type.String(), Type.Number());
const NeighborsBody = Type.Object({
  photoId: Type.String({ minLength: 1 }),
  filter: Type.Optional(FilterSchema),
  lang: Type.Optional(Type.String({ minLength: 2, maxLength: 8 })),
});
const NeighborsResponse = Type.Object({
  previous: Type.Optional(PhotoItem),
  next: Type.Optional(PhotoItem),
  first: Type.Optional(PhotoItem),
  last: Type.Optional(PhotoItem),
  position: Type.Optional(Type.Integer({ minimum: 1 })),
  total: Type.Integer({ minimum: 0 }),
});
const FilterValuesResponse = Type.Object({
  categoryValues: Type.Record(Type.String(), Type.Array(Type.String())),
  byCityLocalized: Type.Record(Type.String(), Type.String()),
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
   * Per-view + filtered fetch (#406). Body carries the same
   * FilterShape `useFiltersStore` produces on the client; optional
   * year/month/day narrows to the calendar slice the public viewer
   * is currently on. Same auth + privacy semantics as the
   * unfiltered GET.
   */
  fastify.post(
    "/:galleryId/query",
    {
      schema: {
        tags: TAGS,
        summary: "Filtered + view-scoped photo fetch",
        params: GalleryIdParam,
        body: QueryBody,
        response: { 200: GalleryPhotosListResponse },
      },
    },
    async (request) => {
      try {
        requireScopeMatches(request, request.params.galleryId);
        await authorizer.authorizeGalleryView(
          request.user.id,
          request.params.galleryId
        );
        const photos = await model.queryGalleryPhotos(
          request.params.galleryId,
          {
            filter: request.body.filter,
            year: request.body.year,
            month: request.body.month,
            day: request.body.day,
            lang: request.body.lang,
          }
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
   * Per-day photo counts for the Year heatmap. Body carries the
   * same filter wire-shape as `/query`; optional `year` narrows to
   * a single year. Map keyed by `YYYY-MM-DD`.
   */
  fastify.post(
    "/:galleryId/counts",
    {
      schema: {
        tags: TAGS,
        summary: "Per-day photo counts (Year heatmap)",
        params: GalleryIdParam,
        body: CountsBody,
        response: { 200: CountsResponse },
      },
    },
    async (request) => {
      try {
        requireScopeMatches(request, request.params.galleryId);
        await authorizer.authorizeGalleryView(
          request.user.id,
          request.params.galleryId
        );
        return await model.queryGalleryPhotoCounts(
          request.params.galleryId,
          { filter: request.body.filter, year: request.body.year }
        );
      } catch (error) {
        if (error instanceof AccessError || error instanceof NotFoundError) {
          return {};
        }
        throw error;
      }
    }
  );

  /**
   * Prev / next / first / last photos within the filtered set,
   * for the Photo modal's carousel + keyboard nav (#406).
   */
  fastify.post(
    "/:galleryId/neighbors",
    {
      schema: {
        tags: TAGS,
        summary: "Adjacent + boundary photos within the filtered set",
        params: GalleryIdParam,
        body: NeighborsBody,
        response: { 200: NeighborsResponse },
      },
    },
    async (request) => {
      try {
        requireScopeMatches(request, request.params.galleryId);
        await authorizer.authorizeGalleryView(
          request.user.id,
          request.params.galleryId
        );
        const result = await model.getGalleryPhotoNeighbors(
          request.params.galleryId,
          request.body.photoId,
          { filter: request.body.filter, lang: request.body.lang }
        );
        if (await shouldHideMap(request.user.id, request.params.galleryId)) {
          maskCoordinates(
            [result.previous, result.next, result.first, result.last]
              .filter((p) => p !== undefined) as Parameters<
              typeof maskCoordinates
            >[0]
          );
        }
        return result;
      } catch (error) {
        if (error instanceof AccessError || error instanceof NotFoundError) {
          return { total: 0 };
        }
        throw error;
      }
    }
  );

  /**
   * Filter pill universe (#532): the gallery's per-category value
   * set, plus the city localized-label map. Subset of `/stats` —
   * shares the stats cache, same invalidation hooks. Drives the
   * Filters sidebar in the gallery viewer without the client having
   * to fetch the gallery's full photo array.
   */
  fastify.get(
    "/:galleryId/filter-values",
    {
      schema: {
        tags: TAGS,
        summary: "Filter pill universe (per-category value set)",
        params: GalleryIdParam,
        querystring: LangQuery,
        response: { 200: FilterValuesResponse },
      },
    },
    async (request) => {
      try {
        requireScopeMatches(request, request.params.galleryId);
        await authorizer.authorizeGalleryView(
          request.user.id,
          request.params.galleryId
        );
        return await model.getGalleryFilterValues(
          request.params.galleryId,
          request.query.lang
        );
      } catch (error) {
        if (error instanceof AccessError || error instanceof NotFoundError) {
          return { categoryValues: {}, byCityLocalized: {} };
        }
        throw error;
      }
    }
  );

  /**
   * Pre-rename / camera-filename bookmark fallback (#532). When a
   * Photo URL's id doesn't resolve via the per-id endpoint, the
   * modal mount falls back to this lookup against the camera-given
   * original filename. Same auth + 404 semantics as the per-id
   * endpoint.
   */
  fastify.get(
    "/:galleryId/by-original-filename/:originalFilename",
    {
      schema: {
        tags: TAGS,
        summary: "Look up a photo by its original camera filename",
        params: GalleryOriginalFilenameParams,
        querystring: LangQuery,
        response: { 200: PhotoItem },
      },
    },
    async (request) => {
      try {
        requireScopeMatches(request, request.params.galleryId);
        await authorizer.authorizeGalleryView(
          request.user.id,
          request.params.galleryId
        );
        const photo = await model.getGalleryPhotoByOriginalFilename(
          request.params.galleryId,
          request.params.originalFilename,
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
      // Link is global-admin-only: a gallery-editor can't see
      // photos outside their galleries, so there's no candidate
      // set for them to pick from.
      await authorizer.authorizeAdmin(request.user.id);
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
        summary: "Unlink a photo from a gallery (gallery-editor)",
        params: GalleryPhotoParams,
        security: [{ bearer: [] }],
      },
    },
    async (request, reply) => {
      requireScopeMatches(request, request.params.galleryId);
      await authorizer.authorizeGalleryEditor(
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
