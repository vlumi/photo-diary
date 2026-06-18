import { Type } from "typebox";
import { type FastifyPluginAsyncTypebox } from "@fastify/type-provider-typebox";

import authorizerFactory from "../lib/authorizer.js";
import { requireUnscoped } from "../lib/host-scope.js";
import { KNOWN_META_KEYS_PUBLIC } from "../lib/meta-keys.js";
import { StringEnum } from "../lib/schema-utils.js";
import modelFactory from "../models/meta.js";

const authorizer = authorizerFactory();
const model = modelFactory();

const init = async () => {
  await model.init();
};

// JSON-shaped meta rows the SPA wants as parsed objects, not the
// stringified blob the DB stores. Centralised so a future "settings
// store nested structure under one row" key can join cleanly.
const JSON_META_KEYS = new Set(["betaFeatures", "renditions"]);

const cleanMeta = (meta: Record<string, unknown>): Record<string, unknown> => {
  return Object.keys(meta)
    .filter((key) => key.startsWith("instance_"))
    .reduce<Record<string, unknown>>((obj, key) => {
      const publicKey = key.replace("instance_", "");
      const raw = meta[key];
      let value: unknown = raw;
      if (JSON_META_KEYS.has(publicKey) && typeof raw === "string" && raw.length > 0) {
        try {
          value = JSON.parse(raw);
        } catch {
          // Malformed row — drop instead of surfacing a string the
          // SPA would crash trying to use as a map.
          return obj;
        }
      }
      return {
        ...obj,
        [publicKey]: value,
      };
    }, {});
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
      // Public, no authorization needed. Each meta key's value comes
      // from the `meta` table; unset keys fall through to the SPA's
      // bundled defaults in `lib/config.ts`. The legacy `.env`
      // fallback path (DEFAULT_GALLERY / DEFAULT_THEME / …) was
      // removed in #609 — operators set runtime defaults via
      // `/m/instance` or `bin/meta.ts`.
      const meta = await model.getMetas();
      return cleanMeta(meta);
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
      requireUnscoped(request);
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
      requireUnscoped(request);
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
      requireUnscoped(request);
      await authorizer.authorizeAdmin(request.user.id);
      await model.deleteMeta(`instance_${request.params.key}`);
      reply.status(204).send();
    }
  );
};

export default { init, plugin };
