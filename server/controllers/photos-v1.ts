import { Type } from "typebox";
import { type FastifyPluginAsyncTypebox } from "@fastify/type-provider-typebox";

import authorizerFactory from "../lib/authorizer.js";
import {
  collectScopePhotoIds,
  requirePhotoInScope,
  requireUnscoped,
} from "../lib/host-scope.js";
import modelFactory from "../models/photo.js";
import type {
  MissingField,
  PhotoFilter,
} from "../lib/photo-filter.js";

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

const MISSING_VALUES = [
  "taken",
  "coords",
  "place",
  "country",
  "author",
  "title",
  "description",
  "state-code",
] as const satisfies readonly MissingField[];
const stringOrArray = (s: typeof Type.String) =>
  Type.Union([s(), Type.Array(s())]);

// Filters mirror the `bin/photo.ts audit` predicate set + gallery
// membership + date range + free-text search. All fields are optional;
// repeated query params (`?gallery=g1&gallery=g2`) accumulate into
// arrays (Fastify default). Pagination defaults to page 1 / 100.
const PhotosQuery = Type.Object(
  {
    gallery: Type.Optional(stringOrArray(Type.String)),
    orphan: Type.Optional(Type.Boolean()),
    dateFrom: Type.Optional(Type.String()),
    dateTo: Type.Optional(Type.String()),
    missing: Type.Optional(
      Type.Union([
        Type.Union(MISSING_VALUES.map((v) => Type.Literal(v))),
        Type.Array(Type.Union(MISSING_VALUES.map((v) => Type.Literal(v)))),
      ])
    ),
    duplicates: Type.Optional(Type.Boolean()),
    countryMismatch: Type.Optional(Type.Boolean()),
    q: Type.Optional(Type.String()),
    page: Type.Optional(Type.Integer({ minimum: 1 })),
    pageSize: Type.Optional(Type.Integer({ minimum: 1, maximum: 500 })),
  },
  { additionalProperties: false }
);

const toArray = <T>(v: T | T[] | undefined): T[] | undefined =>
  v === undefined ? undefined : Array.isArray(v) ? v : [v];

// Permissive — joined photo metadata, wider than any tight contract.
const PhotoItem = Type.Object({}, { additionalProperties: true });
const PhotosListResponse = Type.Object({
  photos: Type.Array(PhotoItem),
  page: Type.Integer(),
  pageSize: Type.Integer(),
  total: Type.Integer(),
});

const TAGS = ["photos"];

const plugin: FastifyPluginAsyncTypebox = async (fastify) => {
  /**
   * Get all photos.
   */
  fastify.get(
    "/",
    {
      schema: {
        tags: TAGS,
        summary:
          "List photos with optional filters; returns a paginated page of the matching set sorted newest-first by capture timestamp",
        querystring: PhotosQuery,
        response: { 200: PhotosListResponse },
        security: [{ bearer: [] }],
      },
    },
    async (request) => {
      await authorizer.authorizeView(request.user.id);
      const q = request.query;
      const filter: PhotoFilter = {
        galleryIds: toArray(q.gallery),
        orphan: q.orphan,
        dateFrom: q.dateFrom,
        dateTo: q.dateTo,
        missing: toArray(q.missing) as MissingField[] | undefined,
        duplicates: q.duplicates,
        countryMismatch: q.countryMismatch,
        q: q.q,
      };
      // On a scoped host, narrow to photos linked to an in-scope
      // gallery. The set passes into the model so pagination still
      // yields the right window size.
      const restrictToIds = await collectScopePhotoIds(request);
      return await model.listPhotos({
        filter,
        page: q.page,
        pageSize: q.pageSize,
        restrictToIds: restrictToIds ?? undefined,
      });
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
      await requirePhotoInScope(request, request.params.photoId);
      await authorizer.authorizeView(request.user.id);
      const photo = await model.getPhoto(request.params.photoId);
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
