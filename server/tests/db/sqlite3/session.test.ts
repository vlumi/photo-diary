import { beforeAll, describe, expect, test, vi } from "vitest";

import { TEST_CONFIG, loadDriver, type Driver } from "./helper.js";

vi.mock("../../../lib/config/index.js", () => ({ default: TEST_CONFIG }));

let driver: Driver;

beforeAll(async () => {
  driver = await loadDriver();
  await driver.createUser({
    id: "session-owner",
    password: "h",
    secret: "s",
    is_admin: 0,
  });
  await driver.createUser({
    id: "other-user",
    password: "h",
    secret: "s",
    is_admin: 0,
  });
});

const mkSession = (id: string, userId: string, ts = 1700000000) => ({
  id,
  user_id: userId,
  refresh_token_hash: `hash-${id}`,
  created_at: ts,
  last_used_at: ts,
});

describe("session", () => {
  test("createSession + loadSession", async () => {
    await driver.createSession(mkSession("s1", "session-owner"));
    const row = (await driver.loadSession("s1")) as { id: string };
    expect(row.id).toBe("s1");
  });

  test("loadSession returns undefined on miss (not an error)", async () => {
    const row = await driver.loadSession("never");
    expect(row).toBeUndefined();
  });

  test("updateSession bumps last_used_at", async () => {
    await driver.createSession(mkSession("s2", "session-owner", 1));
    await driver.updateSession("s2", { last_used_at: 9999 });
    const row = (await driver.loadSession("s2")) as { last_used_at: number };
    expect(row.last_used_at).toBe(9999);
  });

  test("deleteSession removes the row", async () => {
    await driver.createSession(mkSession("s3", "session-owner"));
    await driver.deleteSession("s3");
    expect(await driver.loadSession("s3")).toBeUndefined();
  });

  test("deleteUserSessions only touches the target user", async () => {
    await driver.createSession(mkSession("u1-a", "session-owner"));
    await driver.createSession(mkSession("u1-b", "session-owner"));
    await driver.createSession(mkSession("u2-a", "other-user"));
    await driver.deleteUserSessions("session-owner");
    expect(await driver.loadSession("u1-a")).toBeUndefined();
    expect(await driver.loadSession("u1-b")).toBeUndefined();
    const other = (await driver.loadSession("u2-a")) as { id: string };
    expect(other.id).toBe("u2-a");
  });
});
