import { beforeEach, vi } from "vitest";

import token from "./token";

const STORAGE_KEY = "user";

// jsdom + node 26 doesn't expose `window.localStorage` by default; stub
// a tiny in-memory store for the duration of the test file (mirrors
// the pattern in `stores/theme-preference.test.ts`).
const memoryStorage = (): Storage => {
  let store: Record<string, string> = {};
  return {
    get length() {
      return Object.keys(store).length;
    },
    clear: () => {
      store = {};
    },
    getItem: (key: string) => (key in store ? store[key] : null),
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    key: (i: number) => Object.keys(store)[i] ?? null,
  };
};

beforeEach(() => {
  vi.stubGlobal("localStorage", memoryStorage());
});

test("legacyRefreshToken returns the refresh token from a legacy user blob", () => {
  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ id: "u1", token: "at", refreshToken: "rt", isAdmin: false })
  );
  expect(token.legacyRefreshToken()).toBe("rt");
});

test("legacyRefreshToken returns undefined when there's no user blob", () => {
  expect(token.legacyRefreshToken()).toBeUndefined();
});

test("legacyRefreshToken returns undefined when the blob has no refresh field", () => {
  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ id: "u1", isAdmin: false })
  );
  expect(token.legacyRefreshToken()).toBeUndefined();
});

test("legacyRefreshToken returns undefined when the blob is corrupt", () => {
  window.localStorage.setItem(STORAGE_KEY, "not json");
  expect(token.legacyRefreshToken()).toBeUndefined();
});

test("stripLegacyTokens removes the token + refreshToken fields", () => {
  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      id: "u1",
      token: "at",
      refreshToken: "rt",
      isAdmin: true,
      editorGalleries: ["g1"],
    })
  );
  token.stripLegacyTokens();
  const after = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "{}");
  expect(after).toStrictEqual({
    id: "u1",
    isAdmin: true,
    editorGalleries: ["g1"],
  });
});

test("stripLegacyTokens is a no-op when there are no token fields", () => {
  const blob = { id: "u1", isAdmin: false, editorGalleries: [] };
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(blob));
  token.stripLegacyTokens();
  expect(JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "{}")).toStrictEqual(
    blob
  );
});
