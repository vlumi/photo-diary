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
// FilterShape wire format) + `byCityLocalized`. Admin-only; rejected
// on hostname-bound instances. (Follow-up to #532.)
const LangQuery = Type.Object({
  lang: Type.Optional(Type.String()),
});
const FilterValuesResponse = Type.Object({
  categoryValues: Type.Record(Type.String(), Type.Array(Type.String())),
  byCityLocalized: Type.Record(Type.String(), Type.String()),
});

const TAGS = ["filter-values"];

const init = async (): Promise<void> => {};

const globalPlugin: FastifyPluginAsyncTypebox = async (fastify) => {
  fastify.get(
    "/",
    {
      schema: {
        tags: TAGS,
        summary: "Filter pill universe across all galleries (admin)",
        querystring: LangQuery,
        response: { 200: FilterValuesResponse },
        security: [{ bearer: [] }],
      },
    },
    async (request) => {
      requireUnscoped(request);
      await authorizer.authorizeAdmin(request.user.id);
      return await stats.getGlobalFilterValues(request.query.lang);
    }
  );
};

export default { init, globalPlugin };
