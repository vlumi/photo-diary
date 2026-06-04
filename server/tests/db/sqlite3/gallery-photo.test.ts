import { beforeAll, describe, expect, test, vi } from "vitest";

import { NotFoundError } from "../../../lib/errors.js";
import { TEST_CONFIG, loadDriver, mkGallery, type Driver } from "./helper.js";

vi.mock("../../../lib/config/index.js", () => ({ default: TEST_CONFIG }));

let driver: Driver;

beforeAll(async () => {
  driver = await loadDriver();
  await driver.createGallery(mkGallery({ id: "gp-a" }));
  await driver.createGallery(mkGallery({ id: "gp-b" }));
  await driver.createGallery(mkGallery({ id: "gp-empty" }));
  await driver.createPhoto({ id: "photo-with.ext" });
  await driver.createPhoto({ id: "photo-other.ext" });
  await driver.createPhoto({ id: "photo-orphan.ext" });
  await driver.linkGalleryPhoto(["gp-a", "gp-b"], ["photo-with.ext"]);
  await driver.linkGalleryPhoto(["gp-a"], ["photo-other.ext"]);
});

describe("linkGalleryPhoto", () => {
  test("creates the cross-product of gallery × photo links", async () => {
    const rows = (await driver.loadGalleryPhotos("gp-a")) as Array<{
      id: string;
    }>;
    const ids = rows.map((r) => r.id);
    expect(ids).toContain("photo-with.ext");
    expect(ids).toContain("photo-other.ext");
  });

  test("INSERT OR IGNORE — re-linking the same pair is a no-op", async () => {
    await expect(
      driver.linkGalleryPhoto(["gp-a"], ["photo-with.ext"])
    ).resolves.toBeUndefined();
  });
});

describe("loadGalleryPhotos", () => {
  test("returns only photos linked to the gallery", async () => {
    const rows = (await driver.loadGalleryPhotos("gp-b")) as Array<{
      id: string;
    }>;
    const ids = rows.map((r) => r.id);
    expect(ids).toEqual(["photo-with.ext"]);
  });

  test("empty gallery yields an empty list", async () => {
    const rows = (await driver.loadGalleryPhotos("gp-empty")) as Array<unknown>;
    expect(rows).toEqual([]);
  });
});

describe("loadGalleryPhoto", () => {
  test("returns the row when linked (regression: trailing AND prefix)", async () => {
    const row = (await driver.loadGalleryPhoto(
      "gp-a",
      "photo-with.ext"
    )) as { id: string };
    expect(row.id).toBe("photo-with.ext");
  });

  test("throws NotFoundError when the link is missing", async () => {
    await expect(
      driver.loadGalleryPhoto("gp-empty", "photo-with.ext")
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  test("throws NotFoundError for a non-existent photo", async () => {
    await expect(
      driver.loadGalleryPhoto("gp-a", "never.ext")
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe("loadAllGalleryPhotoLinks", () => {
  test("returns every link, with camelCase fields", async () => {
    const links = (await driver.loadAllGalleryPhotoLinks()) as Array<{
      galleryId: string;
      photoId: string;
    }>;
    const tuples = links.map((l) => `${l.galleryId}:${l.photoId}`);
    expect(tuples).toContain("gp-a:photo-with.ext");
    expect(tuples).toContain("gp-b:photo-with.ext");
    expect(tuples).toContain("gp-a:photo-other.ext");
  });
});

describe("unlink variants", () => {
  test("unlinkGalleryPhoto removes a single pair", async () => {
    await driver.createGallery(mkGallery({ id: "gp-u1" }));
    await driver.linkGalleryPhoto(["gp-u1"], ["photo-with.ext"]);
    await driver.unlinkGalleryPhoto("gp-u1", "photo-with.ext");
    expect(await driver.loadGalleryPhotos("gp-u1")).toEqual([]);
  });

  test("unlinkAllPhotos clears every photo from one gallery", async () => {
    await driver.createGallery(mkGallery({ id: "gp-u2" }));
    await driver.linkGalleryPhoto(
      ["gp-u2"],
      ["photo-with.ext", "photo-other.ext"]
    );
    await driver.unlinkAllPhotos("gp-u2");
    expect(await driver.loadGalleryPhotos("gp-u2")).toEqual([]);
  });

  test("unlinkAllGalleries clears every link for one photo", async () => {
    await driver.createPhoto({ id: "doomed.ext" });
    await driver.linkGalleryPhoto(["gp-a", "gp-b"], ["doomed.ext"]);
    await driver.unlinkAllGalleries("doomed.ext");
    const links = (await driver.loadAllGalleryPhotoLinks()) as Array<{
      photoId: string;
    }>;
    expect(links.filter((l) => l.photoId === "doomed.ext")).toEqual([]);
  });
});
