import { vi, beforeEach, test, expect } from "vitest";

import meta from "./meta";

const mockFetch = (body: unknown, status = 200) =>
  vi.fn().mockResolvedValue(
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    })
  );

const calledUrl = () =>
  ((globalThis.fetch as unknown as { mock: { calls: [Request][] } }).mock
    .calls[0][0]).url;

beforeEach(() => {
  vi.restoreAllMocks();
});

test("getAll()", async () => {
  const metas = { name: "Dummy instance" };
  globalThis.fetch = mockFetch(metas) as unknown as typeof fetch;

  await expect(meta.getAll()).resolves.toStrictEqual(metas);
  expect(calledUrl()).toContain("/api/v1/meta");
});

test("get()", async () => {
  const metaEntry = { name: "Dummy instance" };
  globalThis.fetch = mockFetch(metaEntry) as unknown as typeof fetch;

  await expect(meta.get("name")).resolves.toStrictEqual(metaEntry);
  expect(calledUrl()).toContain("/api/v1/meta/name");
});
