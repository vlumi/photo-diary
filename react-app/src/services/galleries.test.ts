import { vi, beforeEach, test, expect } from "vitest";

import galleries from "./galleries";

const mockFetch = (body: unknown, status = 200) =>
  vi.fn().mockResolvedValue(
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    })
  );

// openapi-fetch passes a `Request` to fetch (not a URL string). `.url` on
// the Request gives the absolute URL, which is what we assert against.
const calledUrl = () =>
  ((globalThis.fetch as unknown as { mock: { calls: [Request][] } }).mock
    .calls[0][0]).url;

beforeEach(() => {
  vi.restoreAllMocks();
});

test("getAll()", async () => {
  const allGalleries = [{ name: "Dummy" }];
  globalThis.fetch = mockFetch(allGalleries) as unknown as typeof fetch;

  await expect(galleries.getAll()).resolves.toStrictEqual(allGalleries);
  expect(calledUrl()).toContain("/api/v1/galleries");
});

test("get()", async () => {
  const gallery = { name: "Dummy" };
  globalThis.fetch = mockFetch(gallery) as unknown as typeof fetch;

  await expect(galleries.get("dummy")).resolves.toStrictEqual(gallery);
  expect(calledUrl()).toContain("/api/v1/galleries/dummy");
});
