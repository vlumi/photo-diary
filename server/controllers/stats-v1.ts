import { Type } from "typebox";
import { type FastifyPluginAsyncTypebox } from "@fastify/type-provider-typebox";

import authorizerFactory from "../lib/authorizer.js";
import { requireScopeMatches, requireUnscoped } from "../lib/host-scope.js";
import statsFactory from "../models/stats.js";
import type { FilterShape } from "../lib/photo-filter-eval.js";

const authorizer = authorizerFactory();
const model = statsFactory();

const init = async () => {};

const GalleryIdParam = Type.Object({ galleryId: Type.String() });

// Filter wire shape. `additionalProperties: true` because the
// evaluator drops unknown categories rather than rejecting — same
// forward-compat property the test suite asserts.
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

const StatsBody = Type.Object({
  filter: Type.Optional(FilterSchema),
  lang: Type.Optional(Type.String({ minLength: 2, maxLength: 8 })),
});
const EvolutionBody = Type.Object({
  category: Type.String({ minLength: 1 }),
  filter: Type.Optional(FilterSchema),
  lang: Type.Optional(Type.String({ minLength: 2, maxLength: 8 })),
});
const EvolutionResponse = Type.Object({
  yearMonths: Type.Array(Type.String()),
  buckets: Type.Record(
    Type.String(),
    Type.Object({
      counts: Type.Array(Type.Number()),
      cumulative: Type.Array(Type.Number()),
    })
  ),
});

const BucketCounts = Type.Record(Type.String(), Type.Number());
const YearMonthCounts = Type.Record(Type.String(), BucketCounts);

const StatsResponse = Type.Object({
  total: Type.Number(),
  geotaggedCount: Type.Number(),
  byCategory: Type.Record(Type.String(), BucketCounts),
  byYearMonth: YearMonthCounts,
  summary: Type.Object({
    first: Type.Optional(Type.String()),
    last: Type.Optional(Type.String()),
    spanDays: Type.Number(),
    spanYears: Type.Number(),
    spanMonths: Type.Number(),
    peakShape: Type.Record(Type.String(), Type.String()),
    variety: Type.Record(Type.String(), Type.Number()),
  }),
  daysInYear: Type.Record(Type.String(), Type.Number()),
  daysInYearMonth: YearMonthCounts,
  byStateCountry: Type.Record(Type.String(), Type.String()),
  byCityCountry: Type.Record(Type.String(), Type.String()),
  byCityLocalized: Type.Record(Type.String(), Type.String()),
  categoryValues: Type.Record(Type.String(), Type.Array(Type.String())),
  byGallery: BucketCounts,
});

const TAGS = ["stats"];

// Gallery-scoped stats. Mounted at `/api/v1/galleries`.
const galleryPlugin: FastifyPluginAsyncTypebox = async (fastify) => {
  fastify.post(
    "/:galleryId/stats",
    {
      schema: {
        tags: TAGS,
        summary: "Aggregated stats for a gallery (gallery view)",
        params: GalleryIdParam,
        body: StatsBody,
        response: { 200: StatsResponse },
        security: [{ bearer: [] }],
      },
    },
    async (request) => {
      requireScopeMatches(request, request.params.galleryId);
      await authorizer.authorizeGalleryView(
        request.user.id,
        request.params.galleryId
      );
      return await model.getGalleryStats(
        request.params.galleryId,
        request.body.filter as FilterShape | undefined,
        request.body.lang
      );
    }
  );

  // Per-bucket time-series for the trend chart (#383). Lazy on the
  // client — only fires when a trendable category's modal opens.
  fastify.post(
    "/:galleryId/stats/evolution",
    {
      schema: {
        tags: TAGS,
        summary: "Per-bucket time-series for a trendable category",
        params: GalleryIdParam,
        body: EvolutionBody,
        response: { 200: EvolutionResponse },
        security: [{ bearer: [] }],
      },
    },
    async (request) => {
      requireScopeMatches(request, request.params.galleryId);
      await authorizer.authorizeGalleryView(
        request.user.id,
        request.params.galleryId
      );
      return await model.getGalleryEvolution(
        request.params.galleryId,
        request.body.category,
        request.body.filter as FilterShape | undefined,
        request.body.lang
      );
    }
  );
};

// Cross-gallery stats. Mounted at `/api/v1/stats`. Admin-only and
// rejected on hostname-bound instances — same surface area as the
// other unscoped admin routes.
const globalPlugin: FastifyPluginAsyncTypebox = async (fastify) => {
  fastify.post(
    "/",
    {
      schema: {
        tags: TAGS,
        summary: "Aggregated stats across all galleries (admin)",
        body: StatsBody,
        response: { 200: StatsResponse },
        security: [{ bearer: [] }],
      },
    },
    async (request) => {
      requireUnscoped(request);
      await authorizer.authorizeAdmin(request.user.id);
      return await model.getGlobalStats(
        request.body.filter as FilterShape | undefined,
        request.body.lang
      );
    }
  );
};

export default { init, galleryPlugin, globalPlugin };
