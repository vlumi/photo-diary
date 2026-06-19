import createClient from "openapi-fetch";

import type { paths } from "./api-schema";
import token from "./token";
import i18n from "./i18n";
import UserModel from "../models/UserModel";
import {
  useUserStore,
  useLoginModalStore,
  useChangePasswordModalStore,
} from "../stores";

// Single typed client for the entire server API. The `paths` type is
// generated from the committed `server/openapi.json` (CI verifies the
// committed JSON matches the live route schemas, so this stays in
// lockstep).
//
// Auth travels as HttpOnly cookies — `credentials: "include"` makes
// the browser attach them to every same-origin call. Logout / 401
// refresh / login responses set or clear the cookies server-side; the
// SPA never reads them.
//
// `fetch` is passed as a thunk that re-reads `globalThis.fetch` on every
// call. Without this, createClient would capture the original `fetch`
// reference at module load, and test fixtures that reassign
// `globalThis.fetch = mock` wouldn't reach the client.
const client = createClient<paths>({
  baseUrl: window.location.origin,
  fetch: (input: RequestInfo | URL, init?: RequestInit) =>
    globalThis.fetch(input, { ...init, credentials: "include" }),
});

// Refresh requests rotate the refresh cookie, so two parallel attempts
// would race and the loser would see its rotated token rejected.
// Coalesce concurrent 401s into one in-flight refresh.
let refreshInFlight: Promise<boolean> | undefined;
const refreshOnce = async (): Promise<boolean> => {
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = (async () => {
    try {
      // Legacy carry-over: if the user has a refresh token in
      // localStorage from a pre-cookie SPA, post it explicitly so the
      // server can rotate and set cookies. Once cookies are in place,
      // strip the legacy token from localStorage so this branch is
      // taken at most once per user. Removable pre-1.0.
      const legacy = token.legacyRefreshToken();
      const body = legacy ? JSON.stringify({ refreshToken: legacy }) : "{}";
      const response = await globalThis.fetch(
        `${window.location.origin}/api/v1/tokens/refresh`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body,
        }
      );
      if (!response.ok) return false;
      if (legacy) token.stripLegacyTokens();
      // editorGalleries can drift between refreshes (grant changes
      // mid-session). Mirror the server's fresh value into the user
      // store + localStorage so the UI's editor-tier tile set stays
      // accurate.
      try {
        const data = (await response.json()) as {
          editorGalleries?: string[];
        };
        if (Array.isArray(data.editorGalleries)) {
          const current = useUserStore.getState().user;
          if (current) {
            const rebuilt = UserModel({
              id: current.id() as string,
              isAdmin: current.isAdmin(),
              editorGalleries: data.editorGalleries,
            });
            useUserStore.getState().setUser(rebuilt);
            window.localStorage.setItem("user", rebuilt.toJson());
          }
        }
      } catch {
        // Body wasn't JSON-shaped — cookies still rotated, ignore.
      }
      return true;
    } catch {
      return false;
    } finally {
      refreshInFlight = undefined;
    }
  })();
  return refreshInFlight;
};

const expireLocalAuth = () => {
  token.stripLegacyTokens();
  window.localStorage.removeItem("user");
  useUserStore.getState().setUser(undefined);
  // Close any other modal that might be open (e.g. change-password mid-
  // submit) so the login modal doesn't stack on top of it — two
  // backdrops at once reads as broken.
  useChangePasswordModalStore.getState().close();
  useLoginModalStore.getState().open(i18n.t("session-expired"));
};

// Legacy carry-over: on bundle load, if the user has a refresh token
// in localStorage from a pre-cookie SPA, post it once so the server
// sets the cookies and we strip the legacy fields. Fire-and-forget —
// the 401-refresh path covers the same case lazily if this somehow
// fails, but doing it upfront avoids the awkward "looks logged in
// but next protected call 401s" gap on first load post-upgrade.
// Removable pre-1.0 alongside #650.
if (token.legacyRefreshToken()) {
  void refreshOnce();
}

client.use({
  // Mid-session 401 handler with refresh fallback. If a request comes
  // back 401 and a refresh succeeds (cookie or legacy localStorage),
  // retry the original. On refresh failure, fall through to the
  // "clear state + open login modal" flow.
  async onResponse({ request, response }) {
    if (response.status !== 401) return;
    // The refresh endpoint itself doesn't get a refresh attempt — that
    // would loop. Login attempts (POST /tokens with no prior session)
    // surface as 401 too; let them through to the login flow's catch.
    if (request.url.endsWith("/api/v1/tokens/refresh")) {
      expireLocalAuth();
      return;
    }
    if (request.method === "POST" && request.url.endsWith("/api/v1/tokens")) {
      return;
    }
    const ok = await refreshOnce();
    if (!ok) {
      expireLocalAuth();
      return;
    }
    // Retry the original request — cookies are now refreshed.
    return await globalThis.fetch(request);
  },
});

// Preserved from the previous fetch wrapper — callers (notably the login
// flow) inspect `error.response.status` to branch on 401 vs 5xx.
export class HttpError extends Error {
  response: { status: number };
  constructor(message: string, status: number) {
    super(message);
    this.response = { status };
  }
}

// Services unwrap openapi-fetch's `{ data, response }` envelope into either
// the parsed body or an `HttpError` — preserving the pre-codegen contract
// where service methods returned the JSON payload directly and threw on
// non-2xx. The `data as T` cast is safe after the `response.ok` check:
// openapi-fetch only leaves `data` undefined when parsing or the request
// itself failed, both of which would also fail `response.ok`.
export const unwrap = async <T>(
  call: Promise<{ data?: T; error?: unknown; response: Response }>
): Promise<T> => {
  const { data, error, response } = await call;
  if (!response.ok) {
    // Server's error handler returns `{ error: "<message>" }` on
    // typed AppError throws (lib/middleware/error-handler.ts).
    // openapi-fetch parses the body for non-2xx into its `error`
    // slot first; fall back to re-reading the response body if
    // openapi-fetch didn't surface anything (e.g. unschematized
    // error responses on some endpoints).
    let message = `Request failed: ${response.status}`;
    const fromOpenApi =
      error && typeof error === "object" && "error" in error
        ? (error as { error?: unknown }).error
        : undefined;
    if (typeof fromOpenApi === "string" && fromOpenApi.length > 0) {
      message = fromOpenApi;
    } else {
      try {
        const body = (await response.clone().json()) as { error?: string };
        if (typeof body.error === "string" && body.error.length > 0) {
          message = body.error;
        }
      } catch {
        // Body wasn't JSON — keep the fallback.
      }
    }
    throw new HttpError(message, response.status);
  }
  return data as T;
};

export default client;
