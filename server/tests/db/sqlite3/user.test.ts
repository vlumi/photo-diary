import { beforeAll, describe, expect, test, vi } from "vitest";

import { NotFoundError } from "../../../lib/errors.js";
import { TEST_CONFIG, loadDriver, type Driver } from "./helper.js";

vi.mock("../../../lib/config/index.js", () => ({ default: TEST_CONFIG }));

let driver: Driver;

beforeAll(async () => {
  driver = await loadDriver();
});

const mkUser = (id: string, isAdmin = 0) => ({
  id,
  name: id,
  password: "$2-fake-hash",
  secret: "fake-secret",
  is_admin: isAdmin,
});

describe("user", () => {
  test("createUser + loadUser", async () => {
    await driver.createUser(mkUser("alice"));
    const row = (await driver.loadUser("alice")) as {
      id: string;
      is_admin: number;
    };
    expect(row.id).toBe("alice");
    expect(row.is_admin).toBe(0);
  });

  test("loadUser throws NotFoundError on miss", async () => {
    await expect(driver.loadUser("never")).rejects.toBeInstanceOf(
      NotFoundError
    );
  });

  test("loadUsers returns all rows", async () => {
    await driver.createUser(mkUser("bob"));
    const rows = (await driver.loadUsers()) as Array<{ id: string }>;
    const ids = rows.map((r) => r.id);
    expect(ids).toContain("alice");
    expect(ids).toContain("bob");
  });

  test("updateUser changes the password column", async () => {
    await driver.createUser(mkUser("carol"));
    await driver.updateUser("carol", { password: "rotated" });
    const row = (await driver.loadUser("carol")) as { password: string };
    expect(row.password).toBe("rotated");
  });

  test("updateUser promotes is_admin", async () => {
    await driver.createUser(mkUser("dora"));
    await driver.updateUser("dora", { is_admin: 1 });
    const row = (await driver.loadUser("dora")) as { is_admin: number };
    expect(row.is_admin).toBe(1);
  });

  test("updateUser with empty patch is a no-op", async () => {
    await driver.createUser(mkUser("eve"));
    await driver.updateUser("eve", {});
    const row = (await driver.loadUser("eve")) as { password: string };
    expect(row.password).toBe("$2-fake-hash");
  });

  test("deleteUser removes the row", async () => {
    await driver.createUser(mkUser("frank"));
    await driver.deleteUser("frank");
    await expect(driver.loadUser("frank")).rejects.toBeInstanceOf(
      NotFoundError
    );
  });
});
