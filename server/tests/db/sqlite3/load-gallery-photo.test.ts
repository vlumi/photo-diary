import { beforeAll, describe, expect, test, vi } from "vitest";

import { NotFoundError } from "../../../lib/errors.js";

// The default test config hardcodes DB_OPTS to "dummy" (the file-
// less driver); the real sqlite driver opens a file at that path,
// so we mock config in this file to point at an in-memory DB
// before the driver's module body runs.
vi.mock("../../../lib/config/index.js", () => ({
  default: {
    ENV: "test",
    PORT: "0",
    SECRET: "test-secret",
    DEBUG: false,
    DB_DRIVER: "sqlite3",
    DB_OPTS: ":memory:",
  },
}));

// Regression: spin up the real sqlite3 driver against an in-memory
// DB and call loadGalleryPhoto directly. The prior bug prefixed the
// second predicate with "AND ", producing the double-AND syntax
// error that `requirePhotoInScope` silently swallowed and surfaced
// as a 404 on every scoped-host photo detail request.

let driver: Awaited<ReturnType<typeof loadDriver>>;

const loadDriver = async () => {
  const factory = await import("../../../db/sqlite3/index.js");
  return factory.default();
};

describe("loadGalleryPhoto", () => {
  beforeAll(async () => {
    driver = await loadDriver();
    // Cast through unknown — the typed `Gallery` / `Photo` shapes
    // expect every field, but the driver layer accepts partials
    // and SQLite fills missing columns with NULL. Same pattern the
    // dummy driver uses in its own fixtures.
    await driver.createGallery({
      id: "g1",
      hostname: ".*",
    } as unknown as Parameters<typeof driver.createGallery>[0]);
    await driver.createPhoto({
      id: "photo-with.ext",
    } as unknown as Parameters<typeof driver.createPhoto>[0]);
    await driver.linkGalleryPhoto(["g1"], ["photo-with.ext"]);
  });

  test("returns the row when linked", async () => {
    const row = (await driver.loadGalleryPhoto(
      "g1",
      "photo-with.ext"
    )) as { id: string };
    expect(row.id).toBe("photo-with.ext");
  });

  test("throws NotFoundError when not linked", async () => {
    await expect(
      driver.loadGalleryPhoto("g1", "unlinked.jpg")
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});
