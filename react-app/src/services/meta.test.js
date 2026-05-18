import { vi, beforeEach, test, expect } from "vitest";

import meta from "./meta";

const mockFetch = (body) =>
  vi.fn().mockResolvedValue({
    ok: true,
    text: async () => JSON.stringify(body),
  });

beforeEach(() => {
  vi.restoreAllMocks();
});

test("getAll()", async () => {
  const allMeta = { name: "Dummy" };
  global.fetch = mockFetch(allMeta);

  await expect(meta.getAll()).resolves.toStrictEqual(allMeta);
  expect(global.fetch.mock.calls[0][0]).toBe("/api/v1/meta");
});

test("get()", async () => {
  const data = { name: "Dummy" };
  global.fetch = mockFetch(data);

  await expect(meta.get("dummy")).resolves.toStrictEqual(data);
  expect(global.fetch.mock.calls[0][0]).toBe("/api/v1/meta/dummy");
});
