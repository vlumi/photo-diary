import { Type } from "typebox";
import { type FastifyPluginAsyncTypebox } from "@fastify/type-provider-typebox";

import authorizerFactory from "../lib/authorizer.js";
import { KNOWN_META_KEYS_PUBLIC } from "../lib/meta-keys.js";
import { StringEnum } from "../lib/schema-utils.js";
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
  // `<NAME>` is upper-snake; underscores collapse to camelCase so the
  // env value maps onto the client's `BetaFeature` keys (`regions`,
  // `focalLengthEquiv`, …). Single-word names like REGIONS still
  // round-trip unchanged.
  const envToCamel = (s: string): string =>
    s.toLowerCase().replace(/_([a-z])/g, (_, c) => c.toUpperCase());
  const beta: Record<string, string> = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (!key.startsWith("BETA_FEATURE_") || !value) continue;
    beta[envToCamel(key.slice("BETA_FEATURE_".length))] = value;
  }
  if (Object.keys(beta).length > 0) out.betaFeatures = beta;
  return out;
};

// Mutation routes lock `key` to the schema-seeded public-facing set
// (matches `bin/meta.ts`'s default key list, minus the `instance_`
// prefix the row gets stored under). `schema_version` and other
// internals stay off-limits. Operators who need an experimental key
// reach for `./bin/meta.ts set --force`.
const MetaKeyEnum = StringEnum(KNOWN_META_KEYS_PUBLIC);
const KnownKeyParam = Type.Object({ key: MetaKeyEnum });
// Open shape — meta keys vary per deploy.
const MetaResponse = Type.Object({}, { additionalProperties: true });
// POST body: user-facing key + value. PUT body is just the value —
// the key comes from the URL.
const MetaCreateBody = Type.Object({
  key: MetaKeyEnum,
  value: Type.String(),
});
const MetaUpdateBody = Type.Object({
  value: Type.String(),
});
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
        body: MetaCreateBody,
        security: [{ bearer: [] }],
      },
    },
    async (request, reply) => {
      await authorizer.authorizeAdmin(request.user.id);
      await model.createMeta({
        key: `instance_${request.body.key}`,
        value: request.body.value,
      });
      reply.status(201).send();
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
        params: KnownKeyParam,
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
        params: KnownKeyParam,
        body: MetaUpdateBody,
        security: [{ bearer: [] }],
      },
    },
    async (request, reply) => {
      await authorizer.authorizeAdmin(request.user.id);
      await model.updateMeta(
        `instance_${request.params.key}`,
        request.body.value
      );
      reply.status(204).send();
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
        params: KnownKeyParam,
        security: [{ bearer: [] }],
      },
    },
    async (request, reply) => {
      await authorizer.authorizeAdmin(request.user.id);
      await model.deleteMeta(`instance_${request.params.key}`);
      reply.status(204).send();
    }
  );
};

export default { init, plugin };
