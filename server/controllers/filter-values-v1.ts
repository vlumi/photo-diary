import { Type } from "typebox";
import { type FastifyPluginAsyncTypebox } from "@fastify/type-provider-typebox";

import authorizerFactory from "../lib/authorizer.js";
import { requireUnscoped } from "../lib/host-scope.js";
import statsFactory from "../models/stats.js";

const authorizer = authorizerFactory();
const stats = statsFactory();

// Global cross-gallery flavour of the filter pill universe — gallery
// flavour lives at `/api/v1/gallery-photos/<id>/filter-values`. Same
// response shape: `categoryValues` (kebab-case to match the
// FilterShape wire format) + `categoryCounts` + `byCityLocalized`.
// Body carries the active filter so counts reflect the current pick
// for the top-N sort. Admin-only; rejected on hostname-bound
// instances.
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
const RequestBody = Type.Object({
  filter: Type.Optional(FilterSchema),
  dateRange: Type.Optional(DateRangeSchema),
  lang: Type.Optional(Type.String({ minLength: 2, maxLength: 8 })),
});
const FilterValuesResponse = Type.Object({
  categoryValues: Type.Record(Type.String(), Type.Array(Type.String())),
  categoryCounts: Type.Record(
    Type.String(),
    Type.Record(Type.String(), Type.Number())
  ),
  byCityLocalized: Type.Record(Type.String(), Type.String()),
});

const TAGS = ["filter-values"];

const init = async (): Promise<void> => {};

const globalPlugin: FastifyPluginAsyncTypebox = async (fastify) => {
  fastify.post(
    "/",
    {
      schema: {
        tags: TAGS,
        summary: "Filter pill universe across all galleries (admin)",
        body: RequestBody,
        response: { 200: FilterValuesResponse },
        security: [{ bearer: [] }],
      },
    },
    async (request) => {
      requireUnscoped(request);
      await authorizer.authorizeAdmin(request.user.id);
      return await stats.getGlobalFilterValues(
        request.body.lang,
        request.body.filter,
        request.body.dateRange
      );
    }
  );
};

export default { init, globalPlugin };
