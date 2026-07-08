import createClient from "openapi-fetch";

import type { paths } from "./api-schema";
import { beginLogin } from "./auth-redirect";
import i18n from "./i18n";
import { queryClient } from "./query-client";
import UserModel from "../models/UserModel";
import { useUserStore, useChangePasswordModalStore } from "../stores";

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
      const response = await globalThis.fetch(
        `${window.location.origin}/api/v1/tokens/refresh`,
        { method: "POST", credentials: "include" }
      );
      if (!response.ok) return false;
      // Server returns {id, isAdmin, editorGalleries} on success;
      // editorGalleries can drift between refreshes (grant changes
      // mid-session), so mirror the fresh values into the user store
      // + localStorage to keep the UI's editor-tier tiles accurate.
      try {
        const data = (await response.json()) as {
          id?: string;
          isAdmin?: boolean;
          editorGalleries?: string[];
        };
        if (
          typeof data.id === "string" &&
          Array.isArray(data.editorGalleries)
        ) {
          const rebuilt = UserModel({
            id: data.id,
            isAdmin: !!data.isAdmin,
            editorGalleries: data.editorGalleries,
          });
          useUserStore.getState().setUser(rebuilt);
          window.localStorage.setItem("user", rebuilt.toJson());
        }
      } catch {
        // Body wasn't JSON-shaped — cookies still rotated, ignore.
      }
      // Any grant / admin-flag change server-side is reflected in
      // the refresh response (see above), but the queryKeys for
      // access-derived caches (galleries, gallery-photos) don't
      // include the grant set — they'd stay pinned to the stale
      // pre-change data until the user id itself changed. Invalidate
      // them so the next render fetches fresh. Cheap; refresh only
      // fires every ~15 min under normal load.
      queryClient.invalidateQueries({ queryKey: ["galleries"] });
      queryClient.invalidateQueries({ queryKey: ["gallery-photos"] });
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
  // Only escalate to the login modal if there was actually a
  // session to expire. Without this, the boot-time verify against
  // /tokens fires the modal for every anonymous visitor (401 →
  // refresh → 401 → here) — the SPA thinks a session was lost when
  // in fact none ever existed. localStorage["user"] is the ground
  // truth for "there was a session"; the Zustand store mirrors it.
  const hadLocalUser =
    !!window.localStorage.getItem("user") || !!useUserStore.getState().user;
  window.localStorage.removeItem("user");
  useUserStore.getState().setUser(undefined);
  if (!hadLocalUser) return;
  // Close any other modal that might be open (e.g. change-password mid-
  // submit) so the login modal doesn't stack on top of it — two
  // backdrops at once reads as broken.
  useChangePasswordModalStore.getState().close();
  // beginLogin delegates to the main host on federated non-main
  // deploys; on a standalone / main host it opens the local login
  // modal with the "session expired" banner.
  beginLogin(i18n.t("session-expired"));
};

// Marker on the retry to prevent double-refresh loops. If the
// refresh-and-retry response ALSO comes back 401, we've hit a case
// the refresh didn't cure (server-side session gone, weird cookie
// desync, etc.) — expire local auth once and give up rather than
// looping the refresh forever.
const RETRIED_HEADER = "x-pd-retried-after-refresh";

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
    // Already retried once and still 401 — refresh didn't fix it.
    // Stop looping.
    if (request.headers.get(RETRIED_HEADER)) {
      expireLocalAuth();
      return;
    }
    const retryHeaders = new Headers(request.headers);
    retryHeaders.set(RETRIED_HEADER, "1");
    const ok = await refreshOnce();
    if (!ok) {
      // Refresh failed — could be a cross-tab race where a sibling
      // tab won the rotation and invalidated our submitted refresh
      // cookie. The browser's shared jar has the sibling's fresh
      // tokens by now, so retry the original once before giving up.
      // If cookies weren't updated (genuine session loss), the
      // retry 401s and we fall through to expire.
      const retry = await globalThis.fetch(request, {
        headers: retryHeaders,
      });
      if (retry.ok) return retry;
      expireLocalAuth();
      return retry;
    }
    // Retry the original request — cookies are now refreshed. Mark
    // it so a repeat 401 doesn't re-enter this handler.
    return await globalThis.fetch(request, { headers: retryHeaders });
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
