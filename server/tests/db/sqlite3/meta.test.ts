import { beforeAll, describe, expect, test, vi } from "vitest";

import { NotFoundError } from "../../../lib/errors.js";
import { TEST_CONFIG, loadDriver, type Driver } from "./helper.js";

vi.mock("../../../lib/config/index.js", () => ({ default: TEST_CONFIG }));

let driver: Driver;

beforeAll(async () => {
  driver = await loadDriver();
});

describe("meta", () => {
  test("loadMetas returns the baseline migration seeds", async () => {
    const metas = (await driver.loadMetas()) as Array<Record<string, string>>;
    const merged = Object.assign({}, ...metas);
    expect(merged.schema_version).toBe("18");
    expect(merged.instance_name).toBe("");
  });

  test("createMeta + loadMeta", async () => {
    await driver.createMeta({ key: "test_create", value: "hello" });
    const row = (await driver.loadMeta("test_create")) as Record<string, string>;
    expect(row.test_create).toBe("hello");
  });

  test("loadMeta throws NotFoundError on miss", async () => {
    await expect(driver.loadMeta("never_exists")).rejects.toBeInstanceOf(
      NotFoundError
    );
  });

  test("updateMeta changes value", async () => {
    await driver.createMeta({ key: "test_update", value: "before" });
    await driver.updateMeta("test_update", { value: "after" });
    const row = (await driver.loadMeta("test_update")) as Record<
      string,
      string
    >;
    expect(row.test_update).toBe("after");
  });

  test("updateMeta with empty patch is a no-op", async () => {
    await driver.createMeta({ key: "test_noop", value: "stays" });
    await driver.updateMeta("test_noop", {});
    const row = (await driver.loadMeta("test_noop")) as Record<string, string>;
    expect(row.test_noop).toBe("stays");
  });

  test("deleteMeta removes the row", async () => {
    await driver.createMeta({ key: "test_delete", value: "going" });
    await driver.deleteMeta("test_delete");
    await expect(driver.loadMeta("test_delete")).rejects.toBeInstanceOf(
      NotFoundError
    );
  });
});
