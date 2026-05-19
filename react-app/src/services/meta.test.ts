import { vi, beforeEach, test, expect } from "vitest";

import meta from "./meta";

const mockFetch = (body: any) =>
  vi.fn().mockResolvedValue({
    ok: true,
    text: async () => JSON.stringify(body),
  });

beforeEach(() => {
  vi.restoreAllMocks();
});

test("getAll()", async () => {
  const allMeta = { name: "Dummy" };
  globalThis.fetch = mockFetch(allMeta) as unknown as typeof fetch;

  await expect(meta.getAll()).resolves.toStrictEqual(allMeta);
  expect((globalThis.fetch as any).mock.calls[0][0]).toBe("/api/v1/meta");
});

test("get()", async () => {
  const data = { name: "Dummy" };
  globalThis.fetch = mockFetch(data) as unknown as typeof fetch;

  await expect(meta.get("dummy")).resolves.toStrictEqual(data);
  expect((globalThis.fetch as any).mock.calls[0][0]).toBe("/api/v1/meta/dummy");
});
