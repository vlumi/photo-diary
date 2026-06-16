import { beforeAll, describe, expect, test, vi } from "vitest";

import { NotFoundError } from "../../../lib/errors.js";
import { TEST_CONFIG, loadDriver, mkGallery, type Driver } from "./helper.js";

vi.mock("../../../lib/config/index.js", () => ({ default: TEST_CONFIG }));

let driver: Driver;

beforeAll(async () => {
  driver = await loadDriver();
  await driver.createGallery(mkGallery({ id: "ph-gal" }));
});

describe("photo CRUD", () => {
  test("createPhoto + loadPhoto (id only)", async () => {
    await driver.createPhoto({ id: "ph-min" });
    const row = (await driver.loadPhoto("ph-min")) as { id: string };
    expect(row.id).toBe("ph-min");
  });

  test("createPhoto accepts a richer field set", async () => {
    await driver.createPhoto({
      id: "ph-full",
      originalFilename: "20240315_103045_RAW.jpg",
      title: "Hello",
      description: "world",
      taken: {
        instant: { timestamp: "2024-03-15 10:30:45" },
        author: "alice",
        location: {
          place: "Park",
          coordinates: { latitude: 60.17, longitude: 24.94 },
        },
      },
      camera: { make: "Canon", model: "R5" },
    });
    const row = (await driver.loadPhoto("ph-full")) as {
      title: string;
      originalFilename?: string;
      taken: { author: string };
    };
    expect(row.title).toBe("Hello");
    expect(row.originalFilename).toBe("20240315_103045_RAW.jpg");
    expect(row.taken.author).toBe("alice");
  });

  test("loadPhoto throws NotFoundError on miss", async () => {
    await expect(driver.loadPhoto("never")).rejects.toBeInstanceOf(
      NotFoundError
    );
  });

  test("loadPhotos returns all rows", async () => {
    const rows = (await driver.loadPhotos()) as Array<{ id: string }>;
    const ids = rows.map((r) => r.id);
    expect(ids).toContain("ph-min");
    expect(ids).toContain("ph-full");
  });

  test("updatePhoto patches only supplied fields", async () => {
    await driver.createPhoto({ id: "ph-upd", title: "old" });
    await driver.updatePhoto("ph-upd", { title: "new" });
    const row = (await driver.loadPhoto("ph-upd")) as { title: string };
    expect(row.title).toBe("new");
  });

  test("deletePhoto removes the row", async () => {
    await driver.createPhoto({ id: "ph-del" });
    await driver.deletePhoto("ph-del");
    await expect(driver.loadPhoto("ph-del")).rejects.toBeInstanceOf(
      NotFoundError
    );
  });
});

describe("loadPhotosByOriginalFilename", () => {
  test("returns every row matching the filename", async () => {
    await driver.createPhoto({
      id: "ph-of-a",
      originalFilename: "IMG_0001.jpg",
    });
    await driver.createPhoto({
      id: "ph-of-b",
      originalFilename: "IMG_0001.jpg",
    });
    await driver.createPhoto({
      id: "ph-of-c",
      originalFilename: "IMG_0002.jpg",
    });
    const rows = (await driver.loadPhotosByOriginalFilename(
      "IMG_0001.jpg"
    )) as Array<{ id: string }>;
    const ids = rows.map((r) => r.id).sort();
    expect(ids).toEqual(["ph-of-a", "ph-of-b"]);
  });

  test("returns [] when no row matches", async () => {
    expect(
      await driver.loadPhotosByOriginalFilename("never.jpg")
    ).toEqual([]);
  });

  test("filename match is case-insensitive", async () => {
    await driver.createPhoto({
      id: "ph-of-upper",
      originalFilename: "IMG_9999.JPG",
    });
    const rows = (await driver.loadPhotosByOriginalFilename(
      "img_9999.jpg"
    )) as Array<{ id: string }>;
    expect(rows.map((r) => r.id)).toContain("ph-of-upper");
  });
});

describe("renamePhoto", () => {
  test("re-keys the photo and its gallery_photo links", async () => {
    await driver.createPhoto({ id: "ph-rename-old" });
    await driver.linkGalleryPhoto(["ph-gal"], ["ph-rename-old"]);
    await driver.renamePhoto("ph-rename-old", "ph-rename-new");
    // Old id is gone.
    await expect(driver.loadPhoto("ph-rename-old")).rejects.toBeInstanceOf(
      NotFoundError
    );
    // New id loads.
    const row = (await driver.loadPhoto("ph-rename-new")) as { id: string };
    expect(row.id).toBe("ph-rename-new");
    // Link followed the rename.
    const links = (await driver.loadAllGalleryPhotoLinks()) as Array<{
      photoId: string;
    }>;
    expect(links.map((l) => l.photoId)).toContain("ph-rename-new");
    expect(links.map((l) => l.photoId)).not.toContain("ph-rename-old");
  });
});

describe("orphan / audit queries", () => {
  beforeAll(async () => {
    await driver.createPhoto({ id: "ph-orphan" });
    // ph-orphan is intentionally not linked anywhere.
    await driver.createPhoto({ id: "ph-linked-audit" });
    await driver.linkGalleryPhoto(["ph-gal"], ["ph-linked-audit"]);
    await driver.createGallery(mkGallery({ id: "ph-empty-gal" }));
  });

  test("loadOrphanPhotoIds returns unlinked photos", async () => {
    const ids = (await driver.loadOrphanPhotoIds()) as string[];
    expect(ids).toContain("ph-orphan");
    expect(ids).not.toContain("ph-linked-audit");
  });

  test("loadEmptyGalleryIds returns galleries with no photos", async () => {
    const ids = (await driver.loadEmptyGalleryIds()) as string[];
    expect(ids).toContain("ph-empty-gal");
    expect(ids).not.toContain("ph-gal");
  });
});

describe("geocoded fields (en)", () => {
  beforeAll(async () => {
    await driver.createPhoto({ id: "ph-geo" });
  });

  test("upsertGeocoded(en) writes the photo row columns", async () => {
    await driver.upsertGeocoded("ph-geo", "en", {
      countryCode: "FI",
      stateCode: "FI-18",
      city: "Helsinki",
      address: '{"country":"Finland"}',
    });
    const row = (await driver.loadPhoto("ph-geo")) as {
      geocoded: {
        countryCode?: string;
        stateCode?: string;
        city?: string;
      };
    };
    expect(row.geocoded.countryCode).toBe("FI");
    expect(row.geocoded.city).toBe("Helsinki");
  });

  test("clearGeocoded nulls every geocoded column", async () => {
    await driver.clearGeocoded("ph-geo");
    const row = (await driver.loadPhoto("ph-geo")) as {
      geocoded: { countryCode?: string; city?: string; noData: boolean };
    };
    expect(row.geocoded.countryCode).toBeUndefined();
    expect(row.geocoded.city).toBeUndefined();
    expect(row.geocoded.noData).toBe(false);
  });

  test("markGeocodeNoData flips the noData flag", async () => {
    await driver.markGeocodeNoData("ph-geo");
    const row = (await driver.loadPhoto("ph-geo")) as {
      geocoded: { noData: boolean };
    };
    expect(row.geocoded.noData).toBe(true);
  });
});

describe("loadPhotosMissingGeocoded", () => {
  beforeAll(async () => {
    await driver.createPhoto({
      id: "ph-missing-1",
      taken: {
        location: { coordinates: { latitude: 1, longitude: 2 } },
      },
    });
    await driver.createPhoto({
      id: "ph-missing-2",
      taken: {
        location: { coordinates: { latitude: 3, longitude: 4 } },
      },
    });
    // Already geocoded — excluded.
    await driver.createPhoto({
      id: "ph-has-geo",
      taken: {
        location: { coordinates: { latitude: 5, longitude: 6 } },
      },
    });
    await driver.upsertGeocoded("ph-has-geo", "en", {
      countryCode: "JP",
      city: "Tokyo",
    });
    // No coords — excluded.
    await driver.createPhoto({ id: "ph-no-coords" });
  });

  test("returns photos with coords but no geocoded city (en)", async () => {
    const rows = (await driver.loadPhotosMissingGeocoded("en", 100)) as Array<{
      id: string;
    }>;
    const ids = rows.map((r) => r.id);
    expect(ids).toContain("ph-missing-1");
    expect(ids).toContain("ph-missing-2");
    expect(ids).not.toContain("ph-has-geo");
    expect(ids).not.toContain("ph-no-coords");
  });

  test("respects the limit", async () => {
    const rows = (await driver.loadPhotosMissingGeocoded("en", 1)) as Array<unknown>;
    expect(rows.length).toBe(1);
  });
});

describe("photo_localized", () => {
  beforeAll(async () => {
    await driver.createPhoto({ id: "ph-loc" });
    await driver.upsertGeocoded("ph-loc", "ja", {
      city: "東京",
      address: '{"city":"\\u6771\\u4eac"}',
    });
  });

  test("loadPhotoLocalized returns rows for the requested lang", async () => {
    const rows = (await driver.loadPhotoLocalized("ja")) as Array<{
      photo_id: string;
      geocoded_city: string | null;
    }>;
    const target = rows.find((r) => r.photo_id === "ph-loc");
    expect(target?.geocoded_city).toBe("東京");
  });

  test("clearLocalizedCity nulls both city and address for the (photo, lang) pair", async () => {
    await driver.clearLocalizedCity("ph-loc", "ja");
    const rows = await driver.loadPhotoLocalized("ja");
    const target = rows.find((r) => r.photo_id === "ph-loc");
    expect(target?.geocoded_city).toBeNull();
    expect(target?.geocoded_address).toBeNull();
  });

  test("upsertGeocoded drops the address blob when the city fails the script rule", async () => {
    // fi-langed Nominatim response for a JP location falls back to
    // local OSM labels (kanji city + kanji per-row labels in the
    // address blob). The acceptLocalizedCity filter rejects the
    // city; the blob must drop alongside so consumers reading
    // address.suburb / address.neighbourhood don't see the kanji.
    await driver.createPhoto({ id: "ph-fi-kanji" });
    await driver.upsertGeocoded("ph-fi-kanji", "fi", {
      city: "品川区",
      address:
        '{"city":"\\u54c1\\u5ddd\\u533a","neighbourhood":"\\u5c0f\\u5c71\\u53f0\\u4e00\\u4e01\\u76ee"}',
    });
    const rows = await driver.loadPhotoLocalized("fi");
    const target = rows.find((r) => r.photo_id === "ph-fi-kanji");
    expect(target?.geocoded_city).toBeNull();
    expect(target?.geocoded_address).toBeNull();
  });

  test("upsertGeocoded overwrites a rejected re-geocode over an existing accepted row", async () => {
    // First write: accepted Latin-script fi value. Second write:
    // rejected kanji — should clear both columns, not COALESCE the
    // old blob back in.
    await driver.createPhoto({ id: "ph-fi-overwrite" });
    await driver.upsertGeocoded("ph-fi-overwrite", "fi", {
      city: "Helsinki",
      address: '{"city":"Helsinki","country":"Suomi"}',
    });
    await driver.upsertGeocoded("ph-fi-overwrite", "fi", {
      city: "品川区",
      address: '{"city":"\\u54c1\\u5ddd\\u533a"}',
    });
    const rows = await driver.loadPhotoLocalized("fi");
    const target = rows.find((r) => r.photo_id === "ph-fi-overwrite");
    expect(target?.geocoded_city).toBeNull();
    expect(target?.geocoded_address).toBeNull();
  });
});

describe("operator-set localized fields", () => {
  beforeAll(async () => {
    await driver.createPhoto({
      id: "ph-opt-loc",
      title: "Sunset",
      description: "Long day at the lake.",
      taken: { location: { place: "Lake" } },
    });
  });

  test("updatePhoto persists titleLocalized / descriptionLocalized / placeLocalized", async () => {
    await driver.updatePhoto("ph-opt-loc", {
      titleLocalized: { ja: "夕日", fi: "Auringonlasku" },
      descriptionLocalized: { ja: "湖で長い一日。" },
      taken: { location: { placeLocalized: { ja: "湖" } } },
    });
    const photo = (await driver.loadPhoto("ph-opt-loc")) as {
      title: string;
      description: string;
      titleLocalized: Record<string, string>;
      descriptionLocalized: Record<string, string>;
      taken: { location: { place: string; placeLocalized: Record<string, string> } };
    };
    // Canonical columns stay untouched.
    expect(photo.title).toBe("Sunset");
    expect(photo.description).toBe("Long day at the lake.");
    expect(photo.taken.location.place).toBe("Lake");
    // Overlay maps populated.
    expect(photo.titleLocalized).toEqual({ ja: "夕日", fi: "Auringonlasku" });
    expect(photo.descriptionLocalized).toEqual({ ja: "湖で長い一日。" });
    expect(photo.taken.location.placeLocalized).toEqual({ ja: "湖" });
  });

  test("empty string in localized map clears that column", async () => {
    await driver.updatePhoto("ph-opt-loc", {
      titleLocalized: { ja: "" },
    });
    const photo = (await driver.loadPhoto("ph-opt-loc")) as {
      titleLocalized: Record<string, string>;
    };
    // Empty string → NULL → dropped from the map.
    expect(photo.titleLocalized).toEqual({ fi: "Auringonlasku" });
  });

  test("omitting a lang leaves that overlay row untouched", async () => {
    // Add a third language explicitly, then make an unrelated update.
    await driver.updatePhoto("ph-opt-loc", {
      titleLocalized: { en: "Sunset over the lake" },
    });
    await driver.updatePhoto("ph-opt-loc", {
      description: "Edited canonical only.",
    });
    const photo = (await driver.loadPhoto("ph-opt-loc")) as {
      description: string;
      titleLocalized: Record<string, string>;
    };
    expect(photo.description).toBe("Edited canonical only.");
    expect(photo.titleLocalized).toEqual({
      fi: "Auringonlasku",
      en: "Sunset over the lake",
    });
  });

  test("photo with no localized rows has empty overlay maps", async () => {
    const photo = (await driver.loadPhoto("ph-min")) as {
      titleLocalized: Record<string, string>;
      descriptionLocalized: Record<string, string>;
      taken: { location: { placeLocalized: Record<string, string> } };
    };
    expect(photo.titleLocalized).toEqual({});
    expect(photo.descriptionLocalized).toEqual({});
    expect(photo.taken.location.placeLocalized).toEqual({});
  });
});

describe("loadOrphanUserGalleryRows", () => {
  test("returns user_gallery rows whose user or gallery is gone", async () => {
    // Set up users + galleries, then nuke one each.
    await driver.createUser({
      id: "to-delete-user",
      name: "to-delete-user",
      password: "h",
      secret: "s",
      is_admin: 0,
    });
    await driver.createGallery(mkGallery({ id: "to-delete-gallery" }));
    await driver.createUser({
      id: "keeper-user",
      name: "keeper-user",
      password: "h",
      secret: "s",
      is_admin: 0,
    });
    await driver.createGallery(mkGallery({ id: "keeper-gallery" }));
    await driver.upsertUserGallery({
      user_id: "to-delete-user",
      gallery_id: "keeper-gallery",
    });
    await driver.upsertUserGallery({
      user_id: "keeper-user",
      gallery_id: "to-delete-gallery",
    });
    await driver.deleteUser("to-delete-user");
    await driver.deleteGallery("to-delete-gallery");
    const orphans = (await driver.loadOrphanUserGalleryRows()) as Array<{
      userId: string;
      galleryId: string;
      missing: "user" | "gallery";
    }>;
    expect(
      orphans.find(
        (o) =>
          o.userId === "to-delete-user" && o.galleryId === "keeper-gallery"
      )?.missing
    ).toBe("user");
    expect(
      orphans.find(
        (o) =>
          o.userId === "keeper-user" && o.galleryId === "to-delete-gallery"
      )?.missing
    ).toBe("gallery");
  });
});
