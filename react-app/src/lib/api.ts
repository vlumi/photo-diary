import createClient from "openapi-fetch";

import type { paths } from "./api-schema";
import token from "./token";
import i18n from "./i18n";
import { useUserStore, useLoginModalStore } from "../stores";

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

client.use({
  onRequest({ request }) {
    const config = token.createConfig();
    const headers = (config.headers ?? {}) as Record<string, string>;
    Object.entries(headers).forEach(([name, value]) => {
      request.headers.set(name, value);
    });
    return request;
  },
  // Global mid-session 401 handler. If a request that *had* an
  // Authorization header (i.e. the user had a session) comes back 401,
  // assume the token is expired or invalidated, clear local auth state,
  // and open the login modal with a context message explaining why. The
  // message goes through the modal store (not the toast strip) because
  // the modal backdrop visually hides toasts. Requests without an
  // Authorization header (login attempts, guest browsing) are ignored
  // here — Login's `catch` handles those inline.
  onResponse({ request, response }) {
    if (response.status !== 401) return;
    if (!request.headers.get("authorization")) return;
    token.clearToken();
    window.localStorage.removeItem("user");
    useUserStore.getState().setUser(undefined);
    useLoginModalStore.getState().open(i18n.t("session-expired"));
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
