import { beforeAll, describe, expect, test, vi } from "vitest";

import { NotFoundError } from "../../../lib/errors.js";
import { TEST_CONFIG, loadDriver, mkGallery, type Driver } from "./helper.js";

vi.mock("../../../lib/config/index.js", () => ({ default: TEST_CONFIG }));

let driver: Driver;

beforeAll(async () => {
  driver = await loadDriver();
});

describe("gallery CRUD", () => {
  test("createGallery + loadGallery (only id required)", async () => {
    await driver.createGallery(mkGallery({ id: "g-min" }));
    const row = (await driver.loadGallery("g-min")) as { id: string };
    expect(row.id).toBe("g-min");
  });

  test("createGallery accepts full field surface", async () => {
    await driver.createGallery({
      id: "g-full",
      title: "Sample",
      description: "desc",
      icon: "icon.png",
      epoch: "2024-01-01",
      epochType: "birthday",
      theme: "blue",
      initialView: "month",
      hostname: "^sample\\.",
    });
    const row = (await driver.loadGallery("g-full")) as {
      title: string;
      theme: string;
      hostname: string;
    };
    expect(row.title).toBe("Sample");
    expect(row.theme).toBe("blue");
    expect(row.hostname).toBe("^sample\\.");
  });

  test("loadGallery throws NotFoundError on miss", async () => {
    await expect(driver.loadGallery("never")).rejects.toBeInstanceOf(
      NotFoundError
    );
  });

  test("loadGalleries returns all rows", async () => {
    const rows = (await driver.loadGalleries()) as Array<{ id: string }>;
    const ids = rows.map((r) => r.id);
    expect(ids).toContain("g-min");
    expect(ids).toContain("g-full");
  });

  test("updateGallery patches only supplied columns", async () => {
    await driver.createGallery(mkGallery({ id: "g-upd", title: "first" }));
    await driver.updateGallery("g-upd", { title: "second" });
    const row = (await driver.loadGallery("g-upd")) as {
      title: string;
      description: string;
    };
    expect(row.title).toBe("second");
    // Untouched column stays at its inserted default.
    expect(row.description).toBe("");
  });

  test("updateGallery with empty patch is a no-op", async () => {
    await driver.createGallery(mkGallery({ id: "g-noop", title: "stays" }));
    await driver.updateGallery("g-noop", {});
    const row = (await driver.loadGallery("g-noop")) as { title: string };
    expect(row.title).toBe("stays");
  });

  test("deleteGallery removes the row", async () => {
    await driver.createGallery(mkGallery({ id: "g-del" }));
    await driver.deleteGallery("g-del");
    await expect(driver.loadGallery("g-del")).rejects.toBeInstanceOf(
      NotFoundError
    );
  });
});

describe("gallery localized + defaultLanguage", () => {
  test("defaultLanguage round-trips through create + update", async () => {
    await driver.createGallery(
      mkGallery({ id: "g-lang", title: "Maisemia", defaultLanguage: "fi" })
    );
    let row = (await driver.loadGallery("g-lang")) as {
      defaultLanguage: string | null;
    };
    expect(row.defaultLanguage).toBe("fi");
    await driver.updateGallery("g-lang", { defaultLanguage: null });
    row = (await driver.loadGallery("g-lang")) as { defaultLanguage: string | null };
    expect(row.defaultLanguage).toBeNull();
  });

  test("update writes title / description overlays, load reads them as maps", async () => {
    await driver.createGallery(
      mkGallery({ id: "g-loc", title: "Landscapes", description: "Scenic shots." })
    );
    await driver.updateGallery("g-loc", {
      titleLocalized: { fi: "Maisemia", ja: "風景" },
      descriptionLocalized: { fi: "Maisemakuvia." },
    });
    const row = (await driver.loadGallery("g-loc")) as {
      title: string;
      description: string;
      titleLocalized: Record<string, string>;
      descriptionLocalized: Record<string, string>;
    };
    expect(row.title).toBe("Landscapes");
    expect(row.description).toBe("Scenic shots.");
    expect(row.titleLocalized).toEqual({ fi: "Maisemia", ja: "風景" });
    expect(row.descriptionLocalized).toEqual({ fi: "Maisemakuvia." });
  });

  test("empty string in overlay map clears that column", async () => {
    await driver.createGallery(mkGallery({ id: "g-clear" }));
    await driver.updateGallery("g-clear", {
      titleLocalized: { fi: "Otsikko" },
    });
    await driver.updateGallery("g-clear", {
      titleLocalized: { fi: "" },
    });
    const row = (await driver.loadGallery("g-clear")) as {
      titleLocalized: Record<string, string>;
    };
    expect(row.titleLocalized).toEqual({});
  });

  test("gallery without overlays returns empty maps", async () => {
    const row = (await driver.loadGallery("g-min")) as {
      titleLocalized: Record<string, string>;
      descriptionLocalized: Record<string, string>;
    };
    expect(row.titleLocalized).toEqual({});
    expect(row.descriptionLocalized).toEqual({});
  });
});
