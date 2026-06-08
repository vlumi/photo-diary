import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { TEST_CONFIG, seedApiFixture } from "../api/fixture.js";

vi.mock("../../lib/config/index.js", () => ({ default: TEST_CONFIG }));

import CONST from "../../lib/constants.js";
import { InvalidTokenError, TokenExpiredError } from "../../lib/errors.js";
import tokenFactory from "../../models/token.js";

const model = tokenFactory();

beforeEach(async () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-05-23T00:00:00Z"));
  await seedApiFixture();
  await model.init();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("verifyToken (access JWT)", () => {
  test("accepts a freshly-issued access token", async () => {
    const { accessToken } = await model.createSession("admin", true);
    const payload = await model.verifyToken(accessToken);
    expect(payload.id).toBe("admin");
  });

  test("accepts an access token just before the expiry boundary", async () => {
    const { accessToken } = await model.createSession("admin", true);
    vi.advanceTimersByTime(CONST.ACCESS_TOKEN_LIFETIME_MS - 1_000);
    await expect(model.verifyToken(accessToken)).resolves.toBeDefined();
  });

  test("throws TokenExpiredError once the access window passes", async () => {
    const { accessToken } = await model.createSession("admin", true);
    vi.advanceTimersByTime(CONST.ACCESS_TOKEN_LIFETIME_MS + 1_000);
    await expect(model.verifyToken(accessToken)).rejects.toBeInstanceOf(
      TokenExpiredError
    );
  });
});

describe("verifyAndRotateRefresh", () => {
  test("rotates the refresh token, the old one stops working", async () => {
    const { refreshToken } = await model.createSession("admin", true);
    const refreshed = await model.verifyAndRotateRefresh(refreshToken);
    expect(refreshed.userId).toBe("admin");
    expect(refreshed.refreshToken).not.toBe(refreshToken);
    // The original token can't be used again.
    await expect(model.verifyAndRotateRefresh(refreshToken)).rejects.toBeInstanceOf(
      InvalidTokenError
    );
  });

  test("rejects a malformed refresh token", async () => {
    await expect(model.verifyAndRotateRefresh("not-a-pair")).rejects.toBeInstanceOf(
      InvalidTokenError
    );
  });

  test("rejects a refresh token whose session has been revoked", async () => {
    const { refreshToken } = await model.createSession("admin", true);
    await model.revokeSession(refreshToken);
    await expect(model.verifyAndRotateRefresh(refreshToken)).rejects.toBeInstanceOf(
      InvalidTokenError
    );
  });

  test("expires the session after SESSION_LENGTH_MS of inactivity", async () => {
    const { refreshToken } = await model.createSession("admin", true);
    vi.advanceTimersByTime(CONST.SESSION_LENGTH_MS + 60_000);
    await expect(model.verifyAndRotateRefresh(refreshToken)).rejects.toBeInstanceOf(
      TokenExpiredError
    );
  });

  test("sliding window: a refresh resets the inactivity clock", async () => {
    const initial = await model.createSession("admin", true);
    vi.advanceTimersByTime(CONST.SESSION_LENGTH_MS - 60_000);
    const refreshed = await model.verifyAndRotateRefresh(initial.refreshToken);
    // The new token works after another near-window of idle time.
    vi.advanceTimersByTime(CONST.SESSION_LENGTH_MS - 60_000);
    await expect(
      model.verifyAndRotateRefresh(refreshed.refreshToken)
    ).resolves.toBeDefined();
  });
});

describe("revokeSession / revokeAllSessions", () => {
  test("revokeSession is per-session — other sessions of the same user are unaffected", async () => {
    const sessionA = await model.createSession("admin", true);
    const sessionB = await model.createSession("admin", true);
    await model.revokeSession(sessionA.refreshToken);
    await expect(
      model.verifyAndRotateRefresh(sessionA.refreshToken)
    ).rejects.toBeInstanceOf(InvalidTokenError);
    await expect(
      model.verifyAndRotateRefresh(sessionB.refreshToken)
    ).resolves.toBeDefined();
  });

  test("revokeAllSessions wipes every session for the user", async () => {
    const a = await model.createSession("admin", true);
    const b = await model.createSession("admin", true);
    await model.revokeAllSessions("admin");
    await expect(model.verifyAndRotateRefresh(a.refreshToken)).rejects.toBeInstanceOf(
      InvalidTokenError
    );
    await expect(model.verifyAndRotateRefresh(b.refreshToken)).rejects.toBeInstanceOf(
      InvalidTokenError
    );
  });

  test("revokeSession is idempotent on a malformed or missing token", async () => {
    await expect(model.revokeSession("not-a-pair")).resolves.toBeUndefined();
    await expect(model.revokeSession("")).resolves.toBeUndefined();
  });
});
