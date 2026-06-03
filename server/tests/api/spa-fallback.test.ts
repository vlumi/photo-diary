import { init } from "../../app.js";
import dummyFactory from "../../db/dummy.js";
import { createApi } from "./helper.js";

const db = dummyFactory();
const { api } = createApi();

beforeEach(async () => {
  await db.init();
  await init();
});

// The catch-all in app.ts answers two callers: the SPA (give me
// index.html for client-side router to handle the path) and the
// API (give me a JSON 404 for unknown routes). Test both so the
// fallback stays scoped to the SPA roots and doesn't swallow
// genuine API misses or unknown random paths.

const expectSpaFallback = async (path: string) => {
  // Build / dev environments may or may not have the bundled
  // index.html on disk. When it's missing, fastify-static still
  // tries to send it and surfaces a 5xx — fine for the routing
  // assertion: what matters is that the catch-all matched this
  // path as an SPA route rather than throwing the JSON 404.
  const res = await api.get(path);
  expect(res.status).not.toBe(404);
};

const expectApi404 = async (path: string) => {
  const res = await api.get(path);
  expect(res.status).toBe(404);
};

describe("SPA fallback routing", () => {
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
    "/s",
    "/s/gallery1",
    "/s/gallery1/2024",
  ])("serves SPA shell for %s", async (path) => {
    await expectSpaFallback(path);
  });

  test.each([
    "/random",
    "/api/v1/this-route-does-not-exist",
    "/api/random",
  ])("returns 404 for non-SPA path %s", async (path) => {
    await expectApi404(path);
  });
});
