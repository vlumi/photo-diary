import { vi, beforeEach, test, expect } from "vitest";

import tokens from "./tokens";

const mockFetch = (body: unknown, status = 200) =>
  vi.fn().mockResolvedValue(
    new Response(body === undefined ? null : JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    })
  );

const calledRequest = () =>
  (globalThis.fetch as unknown as { mock: { calls: [Request][] } }).mock
    .calls[0][0];

beforeEach(() => {
  vi.restoreAllMocks();
});

test("login()", async () => {
  globalThis.fetch = mockFetch({ token: "tok" }) as unknown as typeof fetch;

  await tokens.login("user", "password");
  const request = calledRequest();
  expect(request.url).toContain("/api/v1/tokens");
  expect(request.method).toBe("POST");
  expect(await request.json()).toStrictEqual({
    id: "user",
    password: "password",
  });
});

test("logout()", async () => {
  globalThis.fetch = mockFetch(undefined, 204) as unknown as typeof fetch;

  await tokens.logout();
  const request = calledRequest();
  expect(request.url).toContain("/api/v1/tokens");
  expect(request.method).toBe("DELETE");
});
