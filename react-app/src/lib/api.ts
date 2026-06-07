import createClient from "openapi-fetch";

import type { paths } from "./api-schema";
import token from "./token";
import i18n from "./i18n";
import {
  useUserStore,
  useLoginModalStore,
  useChangePasswordModalStore,
} from "../stores";

// Single typed client for the entire server API. The `paths` type is
// generated from the committed `server/openapi.json` (CI verifies the
// committed JSON matches the live route schemas, so this stays in
// lockstep). Auth is attached via openapi-fetch middleware so callers
// don't have to thread the Authorization header through every call.
// openapi-fetch resolves request URLs via the WHATWG `URL` constructor,
// which requires an absolute base. The previous `fetch("/api/v1/…")`
// usage worked because the browser implicitly resolved against the
// current page origin; openapi-fetch hands the URL constructor a string
// directly. Using `window.location.origin` matches the implicit resolution
// — same-origin requests in production, jsdom's `http://localhost:3000`
// in vitest, with no per-environment plumbing.
//
// `fetch` is passed as a thunk that re-reads `globalThis.fetch` on every
// call. Without this, createClient would capture the original `fetch`
// reference at module load, and test fixtures that reassign
// `globalThis.fetch = mock` wouldn't reach the client.
const client = createClient<paths>({
  baseUrl: window.location.origin,
  fetch: (input) => globalThis.fetch(input),
});

// Refresh tokens rotate on every use, so two parallel refresh calls
// with the same token would race and the loser would be revoked.
// Coalesce concurrent 401s into one in-flight refresh attempt.
let refreshInFlight: Promise<string | undefined> | undefined;
const refreshOnce = async (): Promise<string | undefined> => {
  if (refreshInFlight) return refreshInFlight;
  const current = token.getRefreshToken();
  if (!current) return undefined;
  refreshInFlight = (async () => {
    try {
      const response = await globalThis.fetch(
        `${window.location.origin}/api/v1/tokens/refresh`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken: current }),
        }
      );
      if (!response.ok) return undefined;
      const data = (await response.json()) as {
        accessToken: string;
        refreshToken: string;
        editorGalleries: string[];
      };
      token.setTokens(data.accessToken, data.refreshToken);
      // Mirror the new pair into the stored user blob so a reload picks
      // it up too. The user record's other fields stay as they were,
      // except editorGalleries which the server resolves freshly on
      // every refresh (catches grant changes between refreshes).
      const stored = window.localStorage.getItem("user");
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          parsed.token = data.accessToken;
          parsed.refreshToken = data.refreshToken;
          parsed.editorGalleries = data.editorGalleries;
          window.localStorage.setItem("user", JSON.stringify(parsed));
        } catch {
          // Corrupt localStorage — ignore; in-memory tokens are
          // already updated above.
        }
      }
      return data.accessToken;
    } catch {
      return undefined;
    } finally {
      refreshInFlight = undefined;
    }
  })();
  return refreshInFlight;
};

const expireLocalAuth = () => {
  token.clearTokens();
  window.localStorage.removeItem("user");
  useUserStore.getState().setUser(undefined);
  // Close any other modal that might be open (e.g. change-password mid-
  // submit) so the login modal doesn't stack on top of it — two
  // backdrops at once reads as broken.
  useChangePasswordModalStore.getState().close();
  useLoginModalStore.getState().open(i18n.t("session-expired"));
};

client.use({
  onRequest({ request }) {
    const config = token.createConfig();
    const headers = (config.headers ?? {}) as Record<string, string>;
    Object.entries(headers).forEach(([name, value]) => {
      request.headers.set(name, value);
    });
    return request;
  },
  // Mid-session 401 handler with refresh fallback. If a request that
  // *had* an Authorization header comes back 401 and we have a refresh
  // token in hand, try to refresh once and retry the original request
  // with the new access token. On refresh failure, fall through to the
  // pre-existing "clear state + open login modal" flow.
  // Requests without an Authorization header (login attempts, guest
  // browsing) are ignored — Login's `catch` handles those inline.
  async onResponse({ request, response }) {
    if (response.status !== 401) return;
    if (!request.headers.get("authorization")) return;
    // The refresh endpoint itself doesn't get a refresh attempt — that
    // would loop. Falling through to the login modal is the right
    // behaviour when refresh itself fails.
    if (request.url.endsWith("/api/v1/tokens/refresh")) {
      expireLocalAuth();
      return;
    }
    const newAccess = await refreshOnce();
    if (!newAccess) {
      expireLocalAuth();
      return;
    }
    // Retry the original request with the freshly-minted access token.
    const retry = new Request(request);
    retry.headers.set("Authorization", `bearer ${newAccess}`);
    return await globalThis.fetch(retry);
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
  call: Promise<{ data?: T; response: Response }>
): Promise<T> => {
  const { data, response } = await call;
  if (!response.ok) {
    throw new HttpError(`Request failed: ${response.status}`, response.status);
  }
  return data as T;
};

export default client;
