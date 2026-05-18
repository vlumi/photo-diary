import { vi, beforeEach, test, expect } from "vitest";

import galleries from "./galleries";

const mockFetch = (body) =>
  vi.fn().mockResolvedValue({
    ok: true,
    text: async () => JSON.stringify(body),
  });

beforeEach(() => {
  vi.restoreAllMocks();
});

test("getAll()", async () => {
  const allGalleries = [{ name: "Dummy" }];
  global.fetch = mockFetch(allGalleries);

  await expect(galleries.getAll()).resolves.toStrictEqual(allGalleries);
  expect(global.fetch.mock.calls[0][0]).toBe("/api/v1/galleries");
});

test("get()", async () => {
  const gallery = [{ name: "Dummy" }];
  global.fetch = mockFetch(gallery);

  await expect(galleries.get("dummy")).resolves.toStrictEqual(gallery);
  expect(global.fetch.mock.calls[0][0]).toBe("/api/v1/galleries/dummy");
});
