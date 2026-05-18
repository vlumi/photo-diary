import { vi, beforeEach, test, expect } from "vitest";

import tokens from "./tokens";

const mockFetch = (body = "") =>
  vi.fn().mockResolvedValue({
    ok: true,
    text: async () => (body === "" ? "" : JSON.stringify(body)),
  });

beforeEach(() => {
  vi.restoreAllMocks();
});

test("login()", async () => {
  global.fetch = mockFetch({});

  await tokens.login("user", "password");
  expect(global.fetch.mock.calls[0][0]).toBe("/api/v1/tokens");
  const init = global.fetch.mock.calls[0][1];
  expect(init.method).toBe("POST");
  expect(JSON.parse(init.body)).toStrictEqual({
    id: "user",
    password: "password",
  });
});

test("logout()", async () => {
  global.fetch = mockFetch();

  await expect(tokens.logout()).resolves.toStrictEqual({});
  expect(global.fetch.mock.calls[0][0]).toBe("/api/v1/tokens");
  expect(global.fetch.mock.calls[0][1].method).toBe("DELETE");
});
