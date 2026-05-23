import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import dbFactory from "../../db/dummy.js";
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

  test("accepts a token within its validity window", async () => {
    const token = await model.createToken("admin", true);
    // 6 days in (default validity is 7).
    vi.advanceTimersByTime(6 * 24 * 60 * 60 * 1000);
    await expect(model.verifyToken(token)).resolves.toBeDefined();
  });

  test("throws TokenExpiredError once the validity window passes", async () => {
    const token = await model.createToken("admin", true);
    // 7 days + 1 minute — past the default expiration.
    vi.advanceTimersByTime(7 * 24 * 60 * 60 * 1000 + 60_000);
    await expect(model.verifyToken(token)).rejects.toBeInstanceOf(
      TokenExpiredError
    );
  });
});
