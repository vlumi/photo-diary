import { beforeAll, describe, expect, test, vi } from "vitest";

import { TEST_CONFIG, loadDriver, mkGallery, type Driver } from "./helper.js";

vi.mock("../../../lib/config/index.js", () => ({ default: TEST_CONFIG }));

let driver: Driver;

const mkUser = (id: string, isAdmin = 0) => ({
  id,
  name: id,
  password: "h",
  secret: "s",
  is_admin: isAdmin,
});

beforeAll(async () => {
  driver = await loadDriver();
  await driver.createUser(mkUser("admin", 1));
  await driver.createUser(mkUser("viewer"));
  await driver.createUser(mkUser("editor"));
  await driver.createUser(mkUser("stranger"));
  // `:guest` is seeded by migration 015 — don't re-insert.
  await driver.createGallery(mkGallery({ id: "gal-a" }));
  await driver.createGallery(mkGallery({ id: "gal-b" }));
  await driver.createGallery(mkGallery({ id: "gal-public" }));
  // Direct user_gallery grants.
  await driver.upsertUserGallery({ user_id: "viewer", gallery_id: "gal-a" });
  await driver.upsertUserGallery({
    user_id: "editor",
    gallery_id: "gal-a",
    is_editor: true,
  });
  // Guest grant on the "public" gallery — everyone matches via the ":guest" row.
  await driver.upsertUserGallery({
    user_id: ":guest",
    gallery_id: "gal-public",
  });
});

describe("resolveAccessLevel", () => {
  test("global admin gets access to any gallery without an explicit row", async () => {
    const out = await driver.resolveAccessLevel("admin", "gal-b");
    expect(out).toEqual({ hasAccess: true, isEditor: true });
  });

  test("user with a direct viewer row gets access, not admin", async () => {
    const out = await driver.resolveAccessLevel("viewer", "gal-a");
    expect(out).toEqual({ hasAccess: true, isEditor: false });
  });

  test("user with an is_editor=1 row is upgraded to gallery editor", async () => {
    const out = await driver.resolveAccessLevel("editor", "gal-a");
    expect(out).toEqual({ hasAccess: true, isEditor: true });
  });

  test("user without a row gets no access", async () => {
    const out = await driver.resolveAccessLevel("stranger", "gal-a");
    expect(out).toEqual({ hasAccess: false, isEditor: false });
  });

  test(":guest grants visibility to anyone, without admin", async () => {
    const out = await driver.resolveAccessLevel("stranger", "gal-public");
    expect(out).toEqual({ hasAccess: true, isEditor: false });
  });

  test("unknown user is treated as guest", async () => {
    const out = await driver.resolveAccessLevel("nobody", "gal-public");
    expect(out).toEqual({ hasAccess: true, isEditor: false });
  });
});

describe("loadUserGalleryRows", () => {
  test("no filter returns every row", async () => {
    const rows = (await driver.loadUserGalleryRows()) as Array<unknown>;
    expect(rows.length).toBeGreaterThanOrEqual(3);
  });

  test("filter by userId", async () => {
    const rows = (await driver.loadUserGalleryRows({
      userId: "viewer",
    })) as Array<{ user_id: string }>;
    expect(rows.every((r) => r.user_id === "viewer")).toBe(true);
    expect(rows.length).toBe(1);
  });

  test("filter by galleryId", async () => {
    const rows = (await driver.loadUserGalleryRows({
      galleryId: "gal-a",
    })) as Array<{ gallery_id: string }>;
    expect(rows.every((r) => r.gallery_id === "gal-a")).toBe(true);
    expect(rows.length).toBe(2);
  });

  test("filter by both narrows further", async () => {
    const rows = (await driver.loadUserGalleryRows({
      userId: "viewer",
      galleryId: "gal-a",
    })) as Array<unknown>;
    expect(rows.length).toBe(1);
  });
});

describe("upsertUserGallery", () => {
  test("inserts a new row, then updates only the specified fields", async () => {
    await driver.upsertUserGallery({
      user_id: "stranger",
      gallery_id: "gal-b",
      is_editor: false,
    });
    let out = await driver.resolveAccessLevel("stranger", "gal-b");
    expect(out).toEqual({ hasAccess: true, isEditor: false });
    // Promote without touching hide_map.
    await driver.upsertUserGallery({
      user_id: "stranger",
      gallery_id: "gal-b",
      is_editor: true,
    });
    out = await driver.resolveAccessLevel("stranger", "gal-b");
    expect(out).toEqual({ hasAccess: true, isEditor: true });
  });
});

describe("deleteUserGallery", () => {
  test("removes the row", async () => {
    await driver.upsertUserGallery({
      user_id: "viewer",
      gallery_id: "gal-b",
    });
    await driver.deleteUserGallery("viewer", "gal-b");
    const out = await driver.resolveAccessLevel("viewer", "gal-b");
    expect(out).toEqual({ hasAccess: false, isEditor: false });
  });
});

describe("resolveHideMap", () => {
  test("global admin always sees the map (hide_map = 0)", async () => {
    await driver.upsertUserGallery({
      user_id: ":guest",
      gallery_id: "gal-b",
      hide_map: 1,
    });
    expect(await driver.resolveHideMap("admin", "gal-b")).toBe(0);
  });

  test("user's own user_gallery hide_map wins over guest", async () => {
    await driver.upsertUserGallery({
      user_id: "viewer",
      gallery_id: "gal-public",
      hide_map: 0,
    });
    await driver.upsertUserGallery({
      user_id: ":guest",
      gallery_id: "gal-public",
      hide_map: 1,
    });
    expect(await driver.resolveHideMap("viewer", "gal-public")).toBe(0);
  });

  test("falls through to :guest when the user has no own row", async () => {
    await driver.upsertUserGallery({
      user_id: ":guest",
      gallery_id: "gal-public",
      hide_map: 1,
    });
    expect(await driver.resolveHideMap("stranger", "gal-public")).toBe(1);
  });

  test("undefined when no rule applies", async () => {
    expect(await driver.resolveHideMap("stranger", "gal-a")).toBeUndefined();
  });
});
