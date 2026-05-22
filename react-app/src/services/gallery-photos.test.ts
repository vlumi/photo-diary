import { vi, beforeEach, test, expect } from "vitest";

import galleryPhotos from "./gallery-photos";

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

test("get()", async () => {
  const photos = [{ id: "p1" }];
  globalThis.fetch = mockFetch(photos) as unknown as typeof fetch;

  await expect(galleryPhotos.get("dummy")).resolves.toStrictEqual(photos);
  expect(calledUrl()).toContain("/api/v1/gallery-photos/dummy");
});
