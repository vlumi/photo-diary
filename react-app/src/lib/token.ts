// Legacy refresh-token carry-over: pre-#647 the SPA stored the access
// + refresh tokens inside the `user` localStorage blob. New SPAs let
// HttpOnly cookies handle auth and never read or write the tokens.
//
// During the transition window, this module is the bridge: read a
// legacy refresh token from localStorage so it can be posted to
// /api/v1/tokens/refresh once (server sets cookies + rotates), then
// stripped from localStorage. Removable once cached SPA bundles and
// legacy localStorage have aged out.

const STORAGE_KEY = "user";

const legacyRefreshToken = (): string | undefined => {
  if (typeof window === "undefined" || !window.localStorage) return undefined;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return undefined;
  try {
    const parsed = JSON.parse(raw) as { refreshToken?: unknown };
    return typeof parsed.refreshToken === "string"
      ? parsed.refreshToken
      : undefined;
  } catch {
    return undefined;
  }
};

const stripLegacyTokens = (): void => {
  if (typeof window === "undefined" || !window.localStorage) return;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return;
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (parsed.token === undefined && parsed.refreshToken === undefined) return;
    delete parsed.token;
    delete parsed.refreshToken;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
  } catch {
    // Corrupt localStorage — leave it; the next login flow rewrites it.
  }
};

export default {
  legacyRefreshToken,
  stripLegacyTokens,
};
