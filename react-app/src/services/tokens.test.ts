import { vi, beforeEach, test, expect } from "vitest";

import tokens from "./tokens";

const mockFetch = (body: unknown = "") =>
  vi.fn().mockResolvedValue({
    ok: true,
    text: async () => (body === "" ? "" : JSON.stringify(body)),
  });

beforeEach(() => {
  vi.restoreAllMocks();
});

test("login()", async () => {
  globalThis.fetch = mockFetch({}) as unknown as typeof fetch;

  await tokens.login("user", "password");
  expect((globalThis.fetch as any).mock.calls[0][0]).toBe("/api/v1/tokens");
  const init = (globalThis.fetch as any).mock.calls[0][1];
  expect(init.method).toBe("POST");
  expect(JSON.parse(init.body)).toStrictEqual({
    id: "user",
    password: "password",
  });
});

test("logout()", async () => {
  globalThis.fetch = mockFetch() as unknown as typeof fetch;

  await expect(tokens.logout()).resolves.toStrictEqual({});
  expect((globalThis.fetch as any).mock.calls[0][0]).toBe("/api/v1/tokens");
  expect((globalThis.fetch as any).mock.calls[0][1].method).toBe("DELETE");
});
