import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import dbFactory from "../../db/dummy.js";
import CONST from "../../lib/constants.js";
import { TokenExpiredError } from "../../lib/errors.js";
import tokenFactory from "../../models/token.js";

const db = dbFactory();
const model = tokenFactory();

beforeEach(async () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-05-23T00:00:00Z"));
  await db.init();
  await model.init();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("verifyToken", () => {
  test("accepts a freshly-issued token", async () => {
    const token = await model.createToken("admin", true);
    const payload = await model.verifyToken(token);
    expect(payload.id).toBe("admin");
  });

  test("accepts a token just before the expiry boundary", async () => {
    const token = await model.createToken("admin", true);
    vi.advanceTimersByTime(CONST.SESSION_LENGTH_MS - 60_000);
    await expect(model.verifyToken(token)).resolves.toBeDefined();
  });

  test("throws TokenExpiredError once the validity window passes", async () => {
    const token = await model.createToken("admin", true);
    vi.advanceTimersByTime(CONST.SESSION_LENGTH_MS + 60_000);
    await expect(model.verifyToken(token)).rejects.toBeInstanceOf(
      TokenExpiredError
    );
  });
});
