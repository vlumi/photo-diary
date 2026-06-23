import { Type } from "typebox";
import { type FastifyPluginAsyncTypebox } from "@fastify/type-provider-typebox";

import authorizerFactory from "../lib/authorizer.js";
import { requireScopeMatches } from "../lib/host-scope.js";
import { ID_PATTERN_SOURCE } from "../lib/id-shape.js";
import modelFactory from "../models/saved-filter.js";

const authorizer = authorizerFactory();
const model = modelFactory();

const init = async () => {
  await model.init();
};

// Wire shape mirrors the per-view + stats endpoints' filter body
// envelope (gallery-photos-v1, stats-v1). A saved filter's
// `definition` is whatever you'd pass to `/query` today: an
// optional `filter` (FilterShape) plus an optional `dateRange`
//. Future range / facet additions extend the JSON without
// schema work — the column stores TEXT and the route accepts
// additionalProperties.
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
const NumericRangeSchema = Type.Object(
  {
    min: Type.Optional(Type.Number()),
    max: Type.Optional(Type.Number()),
  },
  { additionalProperties: false }
);
const NumericRangesSchema = Type.Record(Type.String(), NumericRangeSchema);
const SavedFilterDefinition = Type.Object(
  {
    filter: Type.Optional(FilterSchema),
    dateRange: Type.Optional(DateRangeSchema),
    numericRanges: Type.Optional(NumericRangesSchema),
  },
  // Forward-compat: future filter kinds extend the JSON without
  // forcing a schema migration.
  { additionalProperties: true }
);

// Localized title / description overlays mirror the gallery
// localization shape: `{lang: value}`. Empty string in any entry
// clears that overlay row; omitting a lang leaves its existing
// column untouched; an empty map is a no-op on update.
const LocalizedMap = Type.Record(Type.String(), Type.String());

const ParamsList = Type.Object({ galleryId: Type.String() });
const ParamsOne = Type.Object({
  galleryId: Type.String(),
  filterId: Type.String(),
});

// Saved filters live as galleries of type='saved_filter'.
// `id` is a gallery id in its own right (collision-checked against
// every other gallery on create); `sourceGalleryId` points at the
// gallery the saved filter is anchored to.
const SavedFilterResponse = Type.Object({
  id: Type.String(),
  sourceGalleryId: Type.String(),
  title: Type.String(),
  description: Type.String(),
  titleLocalized: LocalizedMap,
  descriptionLocalized: LocalizedMap,
  definition: SavedFilterDefinition,
});
const SavedFiltersListResponse = Type.Array(SavedFilterResponse);

const CreateBody = Type.Object(
  {
    id: Type.String({ minLength: 1, pattern: ID_PATTERN_SOURCE }),
    title: Type.Optional(Type.String()),
    description: Type.Optional(Type.String()),
    titleLocalized: Type.Optional(LocalizedMap),
    descriptionLocalized: Type.Optional(LocalizedMap),
    definition: SavedFilterDefinition,
  },
  { additionalProperties: false }
);
const UpdateBody = Type.Object(
  {
    title: Type.Optional(Type.String()),
    description: Type.Optional(Type.String()),
    titleLocalized: Type.Optional(LocalizedMap),
    descriptionLocalized: Type.Optional(LocalizedMap),
    definition: Type.Optional(SavedFilterDefinition),
  },
  { additionalProperties: false }
);

const TAGS = ["saved-filters"];

const plugin: FastifyPluginAsyncTypebox = async (fastify) => {
  /**
   * List saved filters for a gallery. Read access matches the
   * gallery view ACL — anyone who can see the gallery can see its
   * saved filters (no separate ACL state).
   */
  fastify.get(
    "/:galleryId/filters",
    {
      schema: {
        tags: TAGS,
        summary: "List saved filters for a gallery",
        params: ParamsList,
        response: { 200: SavedFiltersListResponse },
      },
    },
    async (request) => {
      requireScopeMatches(request, request.params.galleryId);
      await authorizer.authorizeGalleryView(
        request.user.id,
        request.params.galleryId
      );
      return await model.getSavedFilters(request.params.galleryId);
    }
  );

  fastify.get(
    "/:galleryId/filters/:filterId",
    {
      schema: {
        tags: TAGS,
        summary: "Get one saved filter by id",
        params: ParamsOne,
        response: { 200: SavedFilterResponse },
      },
    },
    async (request) => {
      requireScopeMatches(request, request.params.galleryId);
      await authorizer.authorizeGalleryView(
        request.user.id,
        request.params.galleryId
      );
      return await model.getSavedFilter(
        request.params.galleryId,
        request.params.filterId
      );
    }
  );

  // Mutations require gallery-editor or admin — same gate as the
  // per-gallery field edits in galleries-v1's PUT.
  fastify.post(
    "/:galleryId/filters",
    {
      schema: {
        tags: TAGS,
        summary: "Create a saved filter",
        params: ParamsList,
        body: CreateBody,
        security: [{ bearer: [] }],
      },
    },
    async (request, reply) => {
      requireScopeMatches(request, request.params.galleryId);
      await authorizer.authorizeGalleryEditor(
        request.user.id,
        request.params.galleryId
      );
      await model.createSavedFilter(request.params.galleryId, request.body);
      reply.status(201).send();
    }
  );

  fastify.put(
    "/:galleryId/filters/:filterId",
    {
      schema: {
        tags: TAGS,
        summary: "Update a saved filter (partial)",
        params: ParamsOne,
        body: UpdateBody,
        security: [{ bearer: [] }],
      },
    },
    async (request, reply) => {
      requireScopeMatches(request, request.params.galleryId);
      await authorizer.authorizeGalleryEditor(
        request.user.id,
        request.params.galleryId
      );
      await model.updateSavedFilter(
        request.params.galleryId,
        request.params.filterId,
        request.body
      );
      reply.status(204).send();
    }
  );

  fastify.delete(
    "/:galleryId/filters/:filterId",
    {
      schema: {
        tags: TAGS,
        summary: "Delete a saved filter",
        params: ParamsOne,
        security: [{ bearer: [] }],
      },
    },
    async (request, reply) => {
      requireScopeMatches(request, request.params.galleryId);
      await authorizer.authorizeGalleryEditor(
        request.user.id,
        request.params.galleryId
      );
      await model.deleteSavedFilter(
        request.params.galleryId,
        request.params.filterId
      );
      reply.status(204).send();
    }
  );
};

export default { init, plugin };
