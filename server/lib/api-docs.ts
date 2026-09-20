import type { FastifySchema } from "fastify";

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
  if (schema.security?.some((entry) => "accessCookie" in entry)) {
    added[403] = errorBody("The requester lacks the grant this needs.");
  }
  return {
    ...schema,
    response: { ...added, ...(schema.response as object | undefined) },
  };
};

type Operations = Record<string, { responses?: Record<string, object> }>;

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
        if (status === "204" || status.startsWith("3")) {
          delete (response as { content?: unknown }).content;
        }
      }
    }
  }
  return doc;
};
