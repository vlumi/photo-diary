import { Type } from "typebox";
import { type FastifyPluginAsyncTypebox } from "@fastify/type-provider-typebox";

import authorizerFactory from "../lib/authorizer.js";
import db from "../db/index.js";
import {
  collectScopePhotoIds,
  requirePhotoInScope,
  requireUnscoped,
} from "../lib/host-scope.js";
import { writeCoordSidecar } from "../lib/inbox-sidecar.js";
import { NumberOrNull } from "../lib/schema-utils.js";
import {
  coordsDiffer,
  mergeCoords,
  readCurrentCoords,
  readIncomingCoords,
} from "../lib/photo-coords.js";
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
// Body shape is restricted to the operator-set override fields:
// title, description, author, country, place, coordinates
// (lat / lon / alt), gear (camera / lens make + model), focal
// length, 35mm-equiv focal length, aperture. The remaining
// EXIF-derived fields (timestamps, dimensions, ISO, shutter,
// serials) and Nominatim-derived `geocoded.*` stay locked —
// owned by the converter / photo-geocode daemon. The 35mm-equiv
// and coordinates are operator-writable because EXIF doesn't
// always carry them (older / phoneless bodies, GPS off).
// `additionalProperties: false` at each nested level rejects
// unknown writes with 400.
// Per-language overlay map for one operator-set field. Keyed by
// lang code, values are strings; empty string clears the overlay
// (sets the column to NULL). Validators for the lang key shape
// stay loose — anything the client sends round-trips back; admin
// UI constrains the choices.
const LocalizedMap = Type.Record(Type.String(), Type.String());
const PhotoOverridesFields = {
  title: Type.Optional(Type.String()),
  description: Type.Optional(Type.String()),
  titleLocalized: Type.Optional(LocalizedMap),
  descriptionLocalized: Type.Optional(LocalizedMap),
  taken: Type.Optional(
    Type.Object(
      {
        author: Type.Optional(Type.String()),
        location: Type.Optional(
          Type.Object(
            {
              country: Type.Optional(Type.String()),
              place: Type.Optional(Type.String()),
              placeLocalized: Type.Optional(LocalizedMap),
              coordinates: Type.Optional(
                Type.Object(
                  {
                    latitude: Type.Optional(NumberOrNull()),
                    longitude: Type.Optional(NumberOrNull()),
                    altitude: Type.Optional(NumberOrNull()),
                  },
                  { additionalProperties: false }
                )
              ),
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
        focalLength35mmEquiv: Type.Optional(Type.Number()),
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
    photoIdFocus: Type.Optional(Type.String()),
  },
  { additionalProperties: false }
);

const toArray = <T>(v: T | T[] | undefined): T[] | undefined =>
  v === undefined ? undefined : Array.isArray(v) ? v : [v];

// Coordinate-change helpers for the geocode auto-refresh path (#415).
// The patch may omit some coord axes; merging with the existing row's
// values lets the converter geocode using the actual post-update state.

// Permissive — joined photo metadata, wider than any tight contract.
const PhotoItem = Type.Object({}, { additionalProperties: true });
const PhotosListResponse = Type.Object({
  photos: Type.Array(PhotoItem),
  page: Type.Integer(),
  pageSize: Type.Integer(),
  total: Type.Integer(),
});
// Query for the year-months timeline. Same shape as PhotosQuery
// without pagination and without dateFrom / dateTo (the timeline
// should not narrow itself — the client strips those before the
// call so the buckets stay stable as the operator drills into a
// specific month).
const YearMonthsQuery = Type.Object(
  {
    gallery: Type.Optional(stringOrArray(Type.String)),
    orphan: Type.Optional(Type.Boolean()),
    missing: Type.Optional(
      Type.Union([
        Type.Union(MISSING_VALUES.map((v) => Type.Literal(v))),
        Type.Array(Type.Union(MISSING_VALUES.map((v) => Type.Literal(v)))),
      ])
    ),
    duplicates: Type.Optional(Type.Boolean()),
    countryMismatch: Type.Optional(Type.Boolean()),
    q: Type.Optional(Type.String()),
  },
  { additionalProperties: false }
);
const YearMonthsResponse = Type.Object({
  buckets: Type.Array(
    Type.Object({
      yearMonth: Type.String(),
      count: Type.Integer(),
    })
  ),
});
const AuditCountsResponse = Type.Object({
  orphan: Type.Integer(),
  duplicates: Type.Integer(),
  countryMismatch: Type.Integer(),
  missing: Type.Object({
    taken: Type.Integer(),
    coords: Type.Integer(),
    place: Type.Integer(),
    country: Type.Integer(),
    author: Type.Integer(),
    title: Type.Integer(),
    description: Type.Integer(),
    "state-code": Type.Integer(),
  }),
});
const PhotosByIdsBody = Type.Object(
  {
    ids: Type.Array(Type.String({ minLength: 1 }), {
      minItems: 1,
      maxItems: 500,
    }),
  },
  { additionalProperties: false }
);
const PhotosByIdsResponse = Type.Object({
  photos: Type.Array(PhotoItem),
});

// FilterShape body — mirrors `/api/v1/gallery-photos/<id>/query`.
// Same `additionalProperties: true` so the evaluator can drop
// unknown categories instead of rejecting the whole payload.
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
const DateRangeSchema = Type.Object(
  {
    from: Type.Optional(Type.String({ pattern: "^\\d{4}-\\d{2}-\\d{2}$" })),
    to: Type.Optional(Type.String({ pattern: "^\\d{4}-\\d{2}-\\d{2}$" })),
  },
  { additionalProperties: false }
);
const QueryBody = Type.Object({
  filter: Type.Optional(FilterSchema),
  dateRange: Type.Optional(DateRangeSchema),
  year: Type.Optional(Type.Integer({ minimum: 1900, maximum: 9999 })),
  month: Type.Optional(Type.Integer({ minimum: 1, maximum: 12 })),
  day: Type.Optional(Type.Integer({ minimum: 1, maximum: 31 })),
  lang: Type.Optional(Type.String({ minLength: 2, maxLength: 8 })),
});
const PhotosQueryResponse = Type.Array(PhotoItem);

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
        photoIdFocus: q.photoIdFocus,
      });
    }
  );

  /**
   * Audit counts per filter predicate. Drives the Manage
   * dashboard's "what's still to fix" tiles — keys match the
   * filter-chip query-string params so each tile is a deep link
   * into `/m/photos?<key>=…`. Host-scope narrows the counts to
   * in-scope photos.
   */
  fastify.get(
    "/audit-counts",
    {
      schema: {
        tags: TAGS,
        summary: "Audit-predicate counts (admin)",
        response: { 200: AuditCountsResponse },
        security: [{ bearer: [] }],
      },
    },
    async (request) => {
      await authorizer.authorizeAdmin(request.user.id);
      const restrictToIds = await collectScopePhotoIds(request);
      return await model.countAudits({
        restrictToIds: restrictToIds ?? undefined,
      });
    }
  );

  /**
   * Year-month bucket counts over the filtered (sans date-range)
   * scope. Drives the Manage Photos sidebar's month-picker
   * timeline — operator clicks a year/month to set dateFrom and
   * dateTo. Counts narrow as other filter chips toggle so the
   * timeline reflects "of the currently-filtered photos, this
   * many are in <YYYY-MM>".
   */
  fastify.get(
    "/year-months",
    {
      schema: {
        tags: TAGS,
        summary: "Photo counts grouped by year-month (admin)",
        querystring: YearMonthsQuery,
        response: { 200: YearMonthsResponse },
        security: [{ bearer: [] }],
      },
    },
    async (request) => {
      await authorizer.authorizeAdmin(request.user.id);
      const q = request.query;
      const filter: PhotoFilter = {
        galleryIds: toArray(q.gallery),
        orphan: q.orphan,
        missing: toArray(q.missing) as MissingField[] | undefined,
        duplicates: q.duplicates,
        countryMismatch: q.countryMismatch,
        q: q.q,
      };
      const restrictToIds = await collectScopePhotoIds(request);
      const buckets = await model.countYearMonths({
        filter,
        restrictToIds: restrictToIds ?? undefined,
      });
      return { buckets };
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
   * Look up many photos in one call. Drives the bulk-edit
   * modal's "what does each selected photo currently hold"
   * check. Open to global-admin + gallery-editor: ids the
   * caller can't edit are silently dropped from the response
   * (matches how host-scope already filters out-of-scope ids).
   * A scope-changed selection therefore surfaces as a smaller
   * result, not an error.
   */
  fastify.post(
    "/by-ids",
    {
      schema: {
        tags: TAGS,
        summary: "Fetch many photos by id (admin / gallery-editor)",
        body: PhotosByIdsBody,
        response: { 200: PhotosByIdsResponse },
        security: [{ bearer: [] }],
      },
    },
    async (request) => {
      const inScope = await collectScopePhotoIds(request);
      const requested = request.body.ids;
      const hostScoped = inScope
        ? requested.filter((id) => inScope.has(id))
        : requested;
      const photos: Record<string, unknown>[] = [];
      for (const id of hostScoped) {
        try {
          await authorizer.authorizePhotoEditor(request.user.id, id);
        } catch {
          continue;
        }
        const row = (await model
          .getPhoto(id)
          .catch(() => null)) as Record<string, unknown> | null;
        if (row) photos.push(row);
      }
      return { photos };
    }
  );

  /**
   * Cross-gallery filter-aware photo list. Drives GlobalStats's
   * lazy Location map — same FilterShape wire envelope as the
   * gallery-scoped `/api/v1/gallery-photos/<id>/query`. Admin-only,
   * rejected on hostname-bound instances (cross-gallery surface).
   */
  fastify.post(
    "/query",
    {
      schema: {
        tags: TAGS,
        summary: "Filter-aware cross-gallery photo list (admin)",
        body: QueryBody,
        response: { 200: PhotosQueryResponse },
        security: [{ bearer: [] }],
      },
    },
    async (request) => {
      requireUnscoped(request);
      await authorizer.authorizeAdmin(request.user.id);
      return await model.queryFilteredGlobal({
        filter: request.body.filter,
        dateRange: request.body.dateRange,
        year: request.body.year,
        month: request.body.month,
        day: request.body.day,
        lang: request.body.lang,
      });
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
        response: { 200: PhotoItem },
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
      await authorizer.authorizePhotoEditor(
        request.user.id,
        request.params.photoId
      );
      const photoId = request.params.photoId;
      const body = request.body as Record<string, unknown>;
      // Did the patch actually change any of the coords? If yes,
      // the geocoded columns become stale — clear them
      // synchronously and write a sidecar so the converter's
      // intake pipeline refreshes them via Nominatim.
      const incomingCoords = readIncomingCoords(body);
      let coordChanged = false;
      let nextCoords:
        | { latitude?: number | null; longitude?: number | null; altitude?: number | null }
        | undefined;
      if (incomingCoords) {
        const existing = (await model.getPhoto(photoId)) as Record<
          string,
          unknown
        >;
        const before = readCurrentCoords(existing);
        coordChanged = coordsDiffer(before, incomingCoords);
        if (coordChanged) {
          nextCoords = mergeCoords(before, incomingCoords);
        }
      }
      await model.updatePhoto(photoId, body);
      if (coordChanged && nextCoords) {
        await db.clearGeocoded(photoId);
        await writeCoordSidecar(photoId, nextCoords);
      }
      reply.status(204).send();
    }
  );

  /**
   * Clear the photo's geocoded_* columns and drop a sidecar so
   * the converter daemon re-fetches via Nominatim. Same semantic
   * as the coord-edit path on `PUT /:photoId`, just without
   * changing the coordinates themselves — for "this row's
   * geocoded data drifted, re-fetch it as-is" cases.
   */
  fastify.post(
    "/:photoId/regeocode",
    {
      schema: {
        tags: TAGS,
        summary: "Clear and re-fetch geocoded data for one photo (admin)",
        params: PhotoIdParam,
        security: [{ bearer: [] }],
      },
    },
    async (request, reply) => {
      await requirePhotoInScope(request, request.params.photoId);
      await authorizer.authorizePhotoEditor(
        request.user.id,
        request.params.photoId
      );
      const photoId = request.params.photoId;
      const existing = (await model.getPhoto(photoId)) as Record<
        string,
        unknown
      >;
      const coords = readCurrentCoords(existing);
      if (coords.latitude === null || coords.longitude === null) {
        // Nothing to geocode without coordinates. Surface as 400
        // rather than silently clearing — the operator probably
        // wanted to verify the row had coords first.
        reply.status(400).send({ error: "Photo has no coordinates" });
        return;
      }
      await db.clearGeocoded(photoId);
      await writeCoordSidecar(photoId, coords);
      await model.invalidateStatsForPhoto(photoId);
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
