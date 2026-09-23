import type { FastifySchema } from "fastify";
import { Type } from "typebox";

import { isNoAuthEndpoint } from "./middleware/token-filter.js";

// How the OpenAPI document describes auth. Documentation only: the
// token filter enforces sessions, the authorizer enforces grants, and
// neither reads a route's `security`.

export const securitySchemes = {
  accessCookie: {
    type: "apiKey",
    in: "cookie",
    name: "pd_access",
    description:
      "Short-lived JWT in an HttpOnly cookie, set by login, refresh and " +
      "SSO consumption. A request without it runs as the guest user. A " +
      "request carrying an invalid or expired one is refused with 401 on " +
      "every endpoint that documents a 401, including those a guest may " +
      "read: call POST /api/v1/tokens/refresh, then retry once.",
  },
  refreshCookie: {
    type: "apiKey",
    in: "cookie",
    name: "pd_refresh",
    description:
      "Long-lived opaque session handle in an HttpOnly cookie. Rotated " +
      "on every refresh; presenting a handle that was already rotated " +
      "away revokes the session.",
  },
} as const;

type Security = NonNullable<FastifySchema["security"]>;

/** A signed-in user is required; a guest gets 403. */
export const SESSION: Security = [{ accessCookie: [] }];
/** A guest may call it; a session widens what it returns. */
export const GUEST_OR_SESSION: Security = [{}, { accessCookie: [] }];
/** Reads the refresh cookie and ignores the access cookie. */
export const REFRESH_SESSION: Security = [{ refreshCookie: [] }];
/** Works without cookies; revokes the session when the refresh cookie is there. */
export const OPTIONAL_REFRESH_SESSION: Security = [{}, { refreshCookie: [] }];

// Success answers without a body. No `type`, so the typed `reply`
// still accepts a bare `.send()`; `dropBodiesOfEmptyResponses` removes
// the JSON body the generator would otherwise report for them.
/** The row now exists; nothing to say beyond that. */
export const CREATED = { 201: { description: "Created." } } as const;
/** Done, nothing to return: updates, deletes, reorderings. */
export const NO_CONTENT = { 204: { description: "Done." } } as const;

/**
 * `headers` for a response that sets (or clears) both auth cookies.
 * OpenAPI cannot list two headers of one name, so one entry stands for
 * the pair.
 */
export const authCookieHeaders = (effect: "set" | "cleared") => ({
  "Set-Cookie": {
    type: "string",
    description:
      effect === "set"
        ? "Two headers, `pd_access` and `pd_refresh`, both HttpOnly."
        : "Two headers clearing `pd_access` and `pd_refresh`.",
  },
});

/** Registered with `app.addSchema`, so the document carries it once. */
export const ErrorResponseSchema = {
  $id: "ErrorResponse",
  type: "object",
  properties: { error: { type: "string" } },
  required: ["error"],
} as const;

const errorBody = (description: string) => ({
  description,
  $ref: "ErrorResponse#",
});

/** For a route that answers an error of its own, beyond the shared ones. */
export const errorResponse = (description: string) =>
  Type.Unsafe<{ error: string }>(errorBody(description));

const VIEWER_GALLERY_ROUTE =
  /^\/api\/v1\/(gallery-photos\/[:{]galleryId|galleries\/[:{]galleryId\}?$)/;

const OWN_401: Record<string, string> = {
  "POST /api/v1/tokens": "Wrong user id or password.",
  "POST /api/v1/tokens/refresh":
    "No refresh cookie, or one that is unknown, expired or already rotated.",
  "GET /api/v1/tokens/sso": "The ticket is invalid, expired or already used.",
};

/**
 * Adds the session failures every route shares to its documented
 * responses, so they are stated once here rather than per route.
 */
export const documentAuthErrors = <S extends FastifySchema | undefined>(
  schema: S,
  url: string,
  method: string
): S => {
  if (!schema || !url.startsWith("/api/")) return schema;
  const added: Record<number, unknown> = {};
  const own = OWN_401[`${method} ${url}`];
  if (own) {
    added[401] = errorBody(own);
  } else if (!isNoAuthEndpoint(url, method)) {
    added[401] = errorBody(
      "The `pd_access` cookie is invalid or expired. Refresh, then retry once."
    );
  }
  // Viewer routes under a gallery never say whether it exists: "no
  // such gallery" and "not one you may see" are the same answer.
  if (VIEWER_GALLERY_ROUTE.test(url)) {
    added[404] = errorBody(
      "No such gallery or photo, or none the requester may see. The two " +
        "are deliberately not told apart."
    );
  }
  if (schema.security?.some((entry) => "accessCookie" in entry)) {
    added[403] = errorBody("The requester lacks the grant this needs.");
  }
  return {
    ...schema,
    response: { ...added, ...(schema.response as object | undefined) },
  };
};

type Operations = Record<string, { responses?: Record<string, object> }>;

// A schema that says nothing about a body: only a description.
const isBodiless = (response: object): boolean => {
  const content = (response as { content?: Record<string, { schema?: object }> })
    .content;
  const schema = content?.["application/json"]?.schema;
  return (
    !!schema && Object.keys(schema).every((key) => key === "description")
  );
};

/**
 * A response with headers needs a schema object to hang them on, which
 * the generator then reports as a JSON body. 204 and redirects have none.
 */
export const dropBodiesOfEmptyResponses = <D extends { paths?: object }>(
  doc: D
): D => {
  const paths = (doc.paths ?? {}) as Record<string, Operations>;
  for (const operations of Object.values(paths)) {
    for (const operation of Object.values(operations)) {
      for (const [status, response] of Object.entries(operation.responses ?? {})) {
        if (status === "204" || status.startsWith("3") || isBodiless(response)) {
          delete (response as { content?: unknown }).content;
        }
      }
    }
  }
  return doc;
};

type Node = Record<string, unknown>;

/**
 * TypeBox writes a nullable value as `anyOf: [X, { type: "null" }]`.
 * That is valid 3.1, but generators handle the plain 3.1 form,
 * `type: [X, "null"]`, and some drop the null half of the union (the
 * Swift generator does, with a warning). The pass rewrites unions of
 * bare scalar types that include null.
 */
export const nullableAsTypeArrays = <D extends object>(doc: D): D => {
  const visit = (value: unknown): void => {
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    if (!value || typeof value !== "object") return;
    const node = value as Node;
    const variants = node.anyOf;
    // Only unions of bare scalar types, one of them null: anything
    // with constraints or structure keeps its `anyOf`.
    const bare = (v: unknown): v is Node =>
      !!v &&
      typeof (v as Node).type === "string" &&
      Object.keys(v as Node).every((key) => key === "type" || key === "description");
    if (
      Array.isArray(variants) &&
      variants.length > 1 &&
      variants.every(bare) &&
      variants.some((v) => v.type === "null")
    ) {
      delete node.anyOf;
      node.type = variants.map((v) => v.type as string);
      const described = variants.find((v) => v.description);
      if (described && !node.description) node.description = described.description;
    }
    Object.values(node).forEach(visit);
  };
  visit(doc);
  return doc;
};
