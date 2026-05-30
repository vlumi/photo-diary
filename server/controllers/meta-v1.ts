import { Type } from "typebox";
import { type FastifyPluginAsyncTypebox } from "@fastify/type-provider-typebox";

import authorizerFactory from "../lib/authorizer.js";
import modelFactory from "../models/meta.js";

const authorizer = authorizerFactory();
const model = modelFactory();

const init = async () => {
  await model.init();
};

const cleanMeta = (meta: Record<string, unknown>): Record<string, unknown> => {
  return Object.keys(meta)
    .filter((key) => key.startsWith("instance_"))
    .reduce<Record<string, unknown>>((obj, key) => {
      return {
        ...obj,
        [key.replace("instance_", "")]: meta[key],
      };
    }, {});
};

// Per-instance frontend defaults from the server's `process.env`.
// Each key is optional; the SPA falls back to `lib/config.ts`.
const envDefaults = (): Record<string, unknown> => {
  const out: Record<string, unknown> = {};
  const { DEFAULT_GALLERY, DEFAULT_THEME, INITIAL_GALLERY_VIEW, FIRST_WEEKDAY } =
    process.env;
  if (DEFAULT_GALLERY) out.defaultGallery = DEFAULT_GALLERY;
  if (DEFAULT_THEME) out.defaultTheme = DEFAULT_THEME;
  if (INITIAL_GALLERY_VIEW) out.initialGalleryView = INITIAL_GALLERY_VIEW;
  if (FIRST_WEEKDAY) out.firstWeekday = FIRST_WEEKDAY;
  // `BETA_FEATURE_<NAME>=user|on|off` → betaFeatures[name] = mode.
  const beta: Record<string, string> = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (!key.startsWith("BETA_FEATURE_") || !value) continue;
    beta[key.slice("BETA_FEATURE_".length).toLowerCase()] = value;
  }
  if (Object.keys(beta).length > 0) out.betaFeatures = beta;
  return out;
};

const KeyParam = Type.Object({ key: Type.String() });
// Open shape — meta keys vary per deploy.
const MetaResponse = Type.Object({}, { additionalProperties: true });
const TAGS = ["meta"];

const plugin: FastifyPluginAsyncTypebox = async (fastify) => {
  /**
   * Get all meta.
   */
  fastify.get(
    "/",
    {
      schema: {
        tags: TAGS,
        summary: "Get all per-instance meta",
        response: { 200: MetaResponse },
      },
    },
    async () => {
      // Public, no authorization needed
      const meta = await model.getMetas();
      return { ...cleanMeta(meta), ...envDefaults() };
    }
  );

  /**
   * Create a meta.
   */
  fastify.post(
    "/",
    {
      schema: {
        tags: TAGS,
        summary: "Create a meta entry (admin)",
        security: [{ bearer: [] }],
      },
    },
    async (request) => {
      await authorizer.authorizeAdmin(request.user.id);
      const meta = {};
      // TODO: validate and set content from request.body
      return await model.createMeta(meta);
    }
  );

  /**
   * Get the matching meta.
   */
  fastify.get(
    "/:key",
    {
      schema: {
        tags: TAGS,
        summary: "Get one meta entry by key",
        params: KeyParam,
        response: { 200: MetaResponse },
      },
    },
    async (request) => {
      // Public, no authorization needed
      const meta = await model.getMeta(`instance_${request.params.key}`);
      return cleanMeta(meta);
    }
  );

  /**
   * Update the matching meta.
   */
  fastify.put(
    "/:key",
    {
      schema: {
        tags: TAGS,
        summary: "Update one meta entry by key (admin)",
        params: KeyParam,
        security: [{ bearer: [] }],
      },
    },
    async (request) => {
      await authorizer.authorizeAdmin(request.user.id);
      const meta = {};
      // TODO: validate and set content from request.body
      return await model.updateMeta(meta);
    }
  );

  /**
   * Delete the matching meta.
   */
  fastify.delete(
    "/:key",
    {
      schema: {
        tags: TAGS,
        summary: "Delete one meta entry by key (admin)",
        params: KeyParam,
        security: [{ bearer: [] }],
      },
    },
    async (request, reply) => {
      await authorizer.authorizeAdmin(request.user.id);
      await model.deleteMeta(request.params.key);
      reply.status(204).send();
    }
  );
};

export default { init, plugin };
