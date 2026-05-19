import { vi, beforeEach, test, expect } from "vitest";

import galleries from "./galleries";

const mockFetch = (body: any) =>
  vi.fn().mockResolvedValue({
    ok: true,
    text: async () => JSON.stringify(body),
  });

beforeEach(() => {
  vi.restoreAllMocks();
});

test("getAll()", async () => {
  const allGalleries = [{ name: "Dummy" }];
  globalThis.fetch = mockFetch(allGalleries) as unknown as typeof fetch;

  await expect(galleries.getAll()).resolves.toStrictEqual(allGalleries);
  expect((globalThis.fetch as any).mock.calls[0][0]).toBe("/api/v1/galleries");
});

test("get()", async () => {
  const gallery = [{ name: "Dummy" }];
  globalThis.fetch = mockFetch(gallery) as unknown as typeof fetch;

  await expect(galleries.get("dummy")).resolves.toStrictEqual(gallery);
  expect((globalThis.fetch as any).mock.calls[0][0]).toBe("/api/v1/galleries/dummy");
});
