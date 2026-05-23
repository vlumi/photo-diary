import { vi, beforeEach, test, expect } from "vitest";

import users from "./users";

const mockFetch = (body: unknown, status = 200) =>
  vi.fn().mockResolvedValue(
    new Response(JSON.stringify(body), {
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

test("changePassword() PUTs the body to /self/password and returns the token", async () => {
  globalThis.fetch = mockFetch({ token: "new-jwt" }) as unknown as typeof fetch;

  await expect(
    users.changePassword("old", "new-stronger-password")
  ).resolves.toStrictEqual({ token: "new-jwt" });

  const request = calledRequest();
  expect(request.url).toContain("/api/v1/users/self/password");
  expect(request.method).toBe("PUT");
  expect(await request.json()).toStrictEqual({
    currentPassword: "old",
    newPassword: "new-stronger-password",
  });
});
