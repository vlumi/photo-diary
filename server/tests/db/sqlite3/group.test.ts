import { beforeAll, describe, expect, test, vi } from "vitest";

import { NotFoundError } from "../../../lib/errors.js";
import { TEST_CONFIG, loadDriver, mkGallery, type Driver } from "./helper.js";

vi.mock("../../../lib/config/index.js", () => ({ default: TEST_CONFIG }));

let driver: Driver;

beforeAll(async () => {
  driver = await loadDriver();
  await driver.createUser({
    id: "g-user-a",
    password: "h",
    secret: "s",
    is_admin: 0,
  });
  await driver.createUser({
    id: "g-user-b",
    password: "h",
    secret: "s",
    is_admin: 0,
  });
  await driver.createGallery(mkGallery({ id: "g-gallery" }));
});

describe("group CRUD", () => {
  test("createGroup + loadGroup", async () => {
    await driver.createGroup({ id: "g1", title: "Family", description: "" });
    const row = (await driver.loadGroup("g1")) as { id: string; title: string };
    expect(row.id).toBe("g1");
    expect(row.title).toBe("Family");
  });

  test("loadGroup throws NotFoundError on miss", async () => {
    await expect(driver.loadGroup("never")).rejects.toBeInstanceOf(
      NotFoundError
    );
  });

  test("loadGroups returns all rows", async () => {
    await driver.createGroup({ id: "g2", title: "Friends", description: "" });
    const rows = (await driver.loadGroups()) as Array<{ id: string }>;
    const ids = rows.map((r) => r.id);
    expect(ids).toContain("g1");
    expect(ids).toContain("g2");
  });

  test("updateGroup changes title", async () => {
    await driver.createGroup({ id: "g3", title: "old", description: "" });
    await driver.updateGroup("g3", { title: "new" });
    const row = (await driver.loadGroup("g3")) as { title: string };
    expect(row.title).toBe("new");
  });

  test("deleteGroup cascades through user_group / group_gallery", async () => {
    await driver.createGroup({ id: "g4", title: "doomed", description: "" });
    await driver.addUserGroup("g-user-a", "g4");
    await driver.upsertGroupGallery({
      group_id: "g4",
      gallery_id: "g-gallery",
    });
    await driver.deleteGroup("g4");
    // Row gone.
    await expect(driver.loadGroup("g4")).rejects.toBeInstanceOf(NotFoundError);
    // FK cascade cleared the membership / grant rows.
    expect(await driver.loadUserGroups("g-user-a")).not.toContain("g4");
    const rows = (await driver.loadGroupGalleryRows({
      groupId: "g4",
    })) as Array<unknown>;
    expect(rows).toEqual([]);
  });
});

describe("group memberships (user_group)", () => {
  beforeAll(async () => {
    await driver.createGroup({
      id: "g-members",
      title: "members",
      description: "",
    });
  });

  test("addUserGroup is idempotent (INSERT OR IGNORE)", async () => {
    await driver.addUserGroup("g-user-a", "g-members");
    await driver.addUserGroup("g-user-a", "g-members");
    const groups = await driver.loadUserGroups("g-user-a");
    expect(groups.filter((g: string) => g === "g-members").length).toBe(1);
  });

  test("loadGroupMembers returns sorted user_ids", async () => {
    await driver.addUserGroup("g-user-b", "g-members");
    await driver.addUserGroup("g-user-a", "g-members");
    const members = (await driver.loadGroupMembers("g-members")) as string[];
    expect(members).toEqual(["g-user-a", "g-user-b"]);
  });

  test("removeUserGroup removes only the targeted pair", async () => {
    await driver.addUserGroup("g-user-a", "g-members");
    await driver.removeUserGroup("g-user-a", "g-members");
    expect(await driver.loadUserGroups("g-user-a")).not.toContain("g-members");
    // Other member kept.
    expect(await driver.loadGroupMembers("g-members")).toContain("g-user-b");
  });
});

describe("group_gallery upsert / load / delete", () => {
  beforeAll(async () => {
    await driver.createGroup({
      id: "g-gg",
      title: "gg",
      description: "",
    });
  });

  test("upsertGroupGallery with no mutable columns is a no-op on conflict", async () => {
    // First call creates the row.
    await driver.upsertGroupGallery({
      group_id: "g-gg",
      gallery_id: "g-gallery",
    });
    // Second call must not throw on the now-conflicting INSERT, even though
    // no mutable columns were supplied — DO NOTHING covers this.
    await expect(
      driver.upsertGroupGallery({
        group_id: "g-gg",
        gallery_id: "g-gallery",
      })
    ).resolves.toBeUndefined();
  });

  test("upsertGroupGallery promotes is_admin without touching hide_map", async () => {
    await driver.upsertGroupGallery({
      group_id: "g-gg",
      gallery_id: "g-gallery",
      hide_map: 1,
    });
    await driver.upsertGroupGallery({
      group_id: "g-gg",
      gallery_id: "g-gallery",
      is_admin: true,
    });
    const rows = (await driver.loadGroupGalleryRows({
      groupId: "g-gg",
    })) as Array<{ is_admin: number; hide_map: number }>;
    expect(rows[0].is_admin).toBe(1);
    expect(rows[0].hide_map).toBe(1);
  });

  test("loadGroupGalleryRows narrows by both filters", async () => {
    const rows = (await driver.loadGroupGalleryRows({
      groupId: "g-gg",
      galleryId: "g-gallery",
    })) as Array<unknown>;
    expect(rows.length).toBe(1);
  });

  test("deleteGroupGallery removes the row", async () => {
    await driver.upsertGroupGallery({
      group_id: "g-gg",
      gallery_id: "g-gallery",
    });
    await driver.deleteGroupGallery("g-gg", "g-gallery");
    const rows = (await driver.loadGroupGalleryRows({
      groupId: "g-gg",
    })) as Array<unknown>;
    expect(rows).toEqual([]);
  });
});
