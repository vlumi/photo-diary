import { Type } from "typebox";
import { Value } from "typebox/value";
import { type FastifyPluginAsyncTypebox } from "@fastify/type-provider-typebox";

import authorizerFactory from "../lib/authorizer.js";
import { requireUnscoped } from "../lib/host-scope.js";
import { KNOWN_META_KEYS_PUBLIC } from "../lib/meta-keys.js";
import { StringEnum } from "../lib/schema-utils.js";
import modelFactory from "../models/meta.js";
import { CREATED, NO_CONTENT, SESSION } from "../lib/api-docs.js";

const authorizer = authorizerFactory();
const model = modelFactory();

const init = async () => {
  await model.init();
};

// What each known key holds once read. Plain keys are the stored
// string; the structured ones are stored as JSON and returned parsed.
// Value sets that may grow (themes, views, feature states) stay plain
// strings rather than enums, so a client built against today's
// document still accepts tomorrow's value.
const STRUCTURED_META = {
  betaFeatures: Type.Record(Type.String(), Type.String(), {
    description: 'Feature name to "on", "off" or "user".',
  }),
  renditions: Type.Array(Type.Number(), {
    description: "Display rendition sizes the converter generates, in pixels.",
  }),
  knownHosts: Type.Array(
    Type.Object(
      { hostname: Type.String(), isMain: Type.Optional(Type.Boolean()) },
      { additionalProperties: true }
    ),
    { description: "Hostnames this instance answers on; one may be the main host." }
  ),
} as const;
type StructuredKey = keyof typeof STRUCTURED_META;
const isStructured = (key: string): key is StructuredKey =>
  Object.hasOwn(STRUCTURED_META, key);

// Rows are operator-written strings nothing validated on the way in.
// A structured one that doesn't parse, or parses into another shape,
// is dropped rather than surfaced: clients fall back to their default,
// where a wrong shape would crash them or fail the response.
const readValue = (publicKey: string, raw: unknown): unknown => {
  if (!isStructured(publicKey)) return raw;
  if (typeof raw !== "string" || raw.length === 0) return undefined;
  try {
    const parsed: unknown = JSON.parse(raw);
    return Value.Check(STRUCTURED_META[publicKey], parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
};

const cleanMeta = (meta: Record<string, unknown>): Record<string, unknown> => {
  const cleaned: Record<string, unknown> = {};
  for (const key of Object.keys(meta)) {
    if (!key.startsWith("instance_")) continue;
    const publicKey = key.replace("instance_", "");
    const value = readValue(publicKey, meta[key]);
    if (value !== undefined) cleaned[publicKey] = value;
  }
  return cleaned;
};

// Mutation routes lock `key` to the schema-seeded public-facing set
// (matches `bin/meta.ts`'s default key list, minus the `instance_`
// prefix the row gets stored under). `schema_version` and other
// internals stay off-limits. Operators who need an experimental key
// reach for `./bin/meta.ts set --force`.
const MetaKeyEnum = StringEnum(KNOWN_META_KEYS_PUBLIC);
const KnownKeyParam = Type.Object({ key: MetaKeyEnum });
// Every known key, each optional: an unset key is absent and the
// client uses its own default. Open on purpose — an operator can force
// an experimental key with `bin/meta.ts set --force`, a newer server
// may know keys an older client doesn't, and either way a client must
// pass over what it doesn't recognize.
const plainKeys = KNOWN_META_KEYS_PUBLIC.filter((key) => !isStructured(key));
const MetaResponse = Type.Object(
  {
    ...Object.fromEntries(
      plainKeys.map((key) => [key, Type.Optional(Type.String())])
    ),
    betaFeatures: Type.Optional(STRUCTURED_META.betaFeatures),
    renditions: Type.Optional(STRUCTURED_META.renditions),
    knownHosts: Type.Optional(STRUCTURED_META.knownHosts),
  },
  { additionalProperties: true }
);
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
      // bundled defaults in `lib/config.ts`. Operators set runtime
      // defaults via `/m/instance` or `bin/meta.ts`.
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
        response: CREATED,
        summary: "Create a meta entry (admin)",
        body: MetaCreateBody,
        security: SESSION,
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
        response: NO_CONTENT,
        summary: "Update one meta entry by key (admin)",
        params: KnownKeyParam,
        body: MetaUpdateBody,
        security: SESSION,
      },
    },
    async (request, reply) => {
      requireUnscoped(request);
      await authorizer.authorizeAdmin(request.user.id);
      // PUT is an upsert (RFC 7231 §4.3.4). A brand-new meta key
      // needs to persist on first save without the client having to
      // fall back to a POST — before this the SQL UPDATE silently
      // no-op'd on a missing row and PUT returned 204 with nothing
      // actually written.
      await model.upsertMeta({
        key: `instance_${request.params.key}`,
        value: request.body.value,
      });
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
        response: NO_CONTENT,
        summary: "Delete one meta entry by key (admin)",
        params: KnownKeyParam,
        security: SESSION,
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
