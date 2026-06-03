import { isSpaRoute } from "../../lib/spa-routes.js";

describe("isSpaRoute", () => {
  test.each([
    "/g",
    "/g/gallery1",
    "/g/gallery1/2024/03",
    "/m",
    "/m/photos",
    "/m/photos/abc123",
    "/m/galleries",
    "/m/galleries/new",
    "/m/g/gallery1",
    "/m/g/gallery1/photos",
    "/m/g/gallery1/photos/abc123",
    "/s",
    "/s/gallery1",
    "/s/gallery1/2024",
  ])("matches SPA root path %s", (path) => {
    expect(isSpaRoute(path)).toBe(true);
  });

  test.each([
    "/",
    "/random",
    "/api/v1/photos",
    "/api/random",
    // Look-alikes that share a prefix with an SPA root but aren't
    // actually under one — `/mountain` must not match because `/m`
    // is followed by `o`, not `/` or end-of-string.
    "/galleries",
    "/manage",
    "/mountain",
    "/stats",
  ])("rejects non-SPA path %s", (path) => {
    expect(isSpaRoute(path)).toBe(false);
  });
});
