import { Type } from "typebox";
import { type FastifyPluginAsyncTypebox } from "@fastify/type-provider-typebox";

import authorizerFactory from "../lib/authorizer.js";
import { requireScopeMatches } from "../lib/host-scope.js";
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
});

const BucketCounts = Type.Record(Type.String(), Type.Number());
const YearMonthCounts = Type.Record(Type.String(), BucketCounts);

const StatsResponse = Type.Object({
  total: Type.Number(),
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
});

const TAGS = ["stats"];

const plugin: FastifyPluginAsyncTypebox = async (fastify) => {
  /**
   * Aggregated stats for one gallery. Body carries the same filter
   * shape `useFiltersStore` produces on the client (topic / category
   * / keys). Empty body returns the unfiltered base — slice 4 will
   * add a single-key cache for that case.
   */
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
        request.body.filter as FilterShape | undefined
      );
    }
  );
};

export default { init, plugin };
