import { vi } from "vitest";
import { TEST_CONFIG, seedApiFixture } from "./fixture.js";

vi.mock("../../lib/config/index.js", () => ({ default: TEST_CONFIG }));

import { init } from "../../app.js";
import { _resetLoginRateLimitForTests } from "../../controllers/tokens-v1.js";
import { createApi, loginUser, loginUserPair } from "./helper.js";

const { api } = createApi();

beforeEach(async () => {
  await seedApiFixture();
  await init();
  // The login throttle holds in-memory per-IP failure counts that persist
  // across tests (supertest always connects from 127.0.0.1, so every test
  // shares one IP key). Reset between tests so each scenario starts fresh.
  _resetLoginRateLimitForTests();
});


describe("Login", () => {
  test("Non-existing user", async () => {
    await api
      .post("/api/v1/tokens")
      .send({
        id: "wrong",
        password: "wrong",
      })
      .expect(401);
  });
  test("Wrong password", async () => {
    await api
      .post("/api/v1/tokens")
      .send({
        id: "admin",
        password: "wrong",
      })
      .expect(401);
  });
  test("Successful login", async () => {
    const result = await api
      .post("/api/v1/tokens")
      .send({
        id: "admin",
        password: "foobar",
      })
      .expect(200);
    // Login response carries identity claims for the SPA; tokens
    // travel via the HttpOnly cookies set on the same response.
    expect(result.body.id).toBe("admin");
    expect(result.body.isAdmin).toBe(true);
    expect(Array.isArray(result.body.editorGalleries)).toBe(true);
  });
  test("Login sets HttpOnly auth cookies", async () => {
    const result = await api
      .post("/api/v1/tokens")
      .send({ id: "admin", password: "foobar" })
      .expect(200);
    const cookies = result.headers["set-cookie"] as unknown as string[];
    expect(Array.isArray(cookies)).toBe(true);
    const accessCookie = cookies.find((c) => c.startsWith("pd_access="));
    const refreshCookie = cookies.find((c) => c.startsWith("pd_refresh="));
    expect(accessCookie).toMatch(/HttpOnly/i);
    expect(accessCookie).toMatch(/Secure/i);
    expect(accessCookie).toMatch(/SameSite=Lax/i);
    expect(refreshCookie).toMatch(/HttpOnly/i);
    expect(refreshCookie).toMatch(/Secure/i);
    expect(refreshCookie).toMatch(/SameSite=Lax/i);
  });
  test("Cookie auth — requests with pd_access cookie are authenticated", async () => {
    const cookies = (await api
      .post("/api/v1/tokens")
      .send({ id: "admin", password: "foobar" })
      .expect(200)).headers["set-cookie"] as unknown as string[];
    const accessCookie = cookies.find((c) => c.startsWith("pd_access="));
    // Identify by GET /api/v1/users which requires admin auth. Use
    // the literal Set-Cookie line as the request's Cookie header.
    await api
      .get("/api/v1/users")
      .set("Cookie", accessCookie ?? "")
      .expect(200);
  });
});
describe("Login rate limit", () => {
  test("10 failed logins → 11th returns 429", async () => {
    for (let i = 0; i < 10; i++) {
      await api
        .post("/api/v1/tokens")
        .send({ id: "admin", password: "wrong" })
        .expect(401);
    }
    const result = await api
      .post("/api/v1/tokens")
      .send({ id: "admin", password: "wrong" })
      .expect(429);
    expect(result.body.error).toMatch(/too many failed login attempts/i);
  });

  test("Successful logins do not tick the counter", async () => {
    // 5 failures + a successful login + 5 more failures = 10 failures total.
    // The 11th request should still pass through to the credential check (=
    // not 429) — proving the success didn't add to the failure count.
    for (let i = 0; i < 5; i++) {
      await api
        .post("/api/v1/tokens")
        .send({ id: "admin", password: "wrong" })
        .expect(401);
    }
    await api
      .post("/api/v1/tokens")
      .send({ id: "admin", password: "foobar" })
      .expect(200);
    for (let i = 0; i < 5; i++) {
      await api
        .post("/api/v1/tokens")
        .send({ id: "admin", password: "wrong" })
        .expect(401);
    }
    // 10 failures cumulative, so the next failure should trip the limit.
    await api
      .post("/api/v1/tokens")
      .send({ id: "admin", password: "wrong" })
      .expect(429);
  });

  test("Successful logins alone never trip the limit", async () => {
    for (let i = 0; i < 15; i++) {
      await api
        .post("/api/v1/tokens")
        .send({ id: "admin", password: "foobar" })
        .expect(200);
    }
  });
});

describe("Keep-alive", () => {
  test("Admin: returns identity + isAdmin: true + editorGalleries", async () => {
    const token = await loginUser(api, "admin");
    const res = await api
      .get("/api/v1/tokens")
      .set("Cookie", `pd_access=${token}`)
      .expect(200);
    expect(res.body).toEqual({
      id: "admin",
      isAdmin: true,
      editorGalleries: expect.any(Array),
    });
  });
  test("Non-admin: returns identity + isAdmin: false", async () => {
    const token = await loginUser(api, "gallery1user");
    const res = await api
      .get("/api/v1/tokens")
      .set("Cookie", `pd_access=${token}`)
      .expect(200);
    expect(res.body.id).toBe("gallery1user");
    expect(res.body.isAdmin).toBe(false);
  });
  test("Guest: 401 so the SPA can clear stale localStorage", async () => {
    await api.get("/api/v1/tokens").expect(401);
  });
});

describe("Refresh", () => {
  test("rotates the refresh cookie + sets a fresh access cookie", async () => {
    const pair = await loginUserPair(api, "admin");
    const refreshed = await api
      .post("/api/v1/tokens/refresh")
      .set("Cookie", `pd_refresh=${pair.refreshToken}`)
      .expect(200);
    expect(refreshed.body.id).toBe("admin");
    expect(refreshed.body.isAdmin).toBe(true);
    const cookies = refreshed.headers["set-cookie"] as unknown as string[];
    const newRefresh = cookies.find((c) => c.startsWith("pd_refresh="));
    expect(newRefresh).toBeDefined();
    expect(newRefresh).not.toContain(pair.refreshToken);
    // Re-using the consumed refresh token fails.
    await api
      .post("/api/v1/tokens/refresh")
      .set("Cookie", `pd_refresh=${pair.refreshToken}`)
      .expect(401);
  });

  test("rejects a malformed refresh cookie", async () => {
    await api
      .post("/api/v1/tokens/refresh")
      .set("Cookie", "pd_refresh=not-a-pair")
      .expect(401);
  });

  test("returns 401 when no refresh cookie is sent", async () => {
    await api.post("/api/v1/tokens/refresh").expect(401);
  });
});

describe("Logout", () => {
  test("revokes only the calling session — other sessions stay valid", async () => {
    const sessionA = await loginUserPair(api, "plainuser");
    const sessionB = await loginUserPair(api, "plainuser");
    await api
      .delete("/api/v1/tokens")
      .set("Cookie", `pd_refresh=${sessionA.refreshToken}`)
      .expect(204);
    await api
      .post("/api/v1/tokens/refresh")
      .set("Cookie", `pd_refresh=${sessionA.refreshToken}`)
      .expect(401);
    await api
      .post("/api/v1/tokens/refresh")
      .set("Cookie", `pd_refresh=${sessionB.refreshToken}`)
      .expect(200);
  });

  test("Logout clears the auth cookies", async () => {
    const session = await loginUserPair(api, "plainuser");
    const logout = await api
      .delete("/api/v1/tokens")
      .set(
        "Cookie",
        `pd_access=${session.accessToken}; pd_refresh=${session.refreshToken}`
      )
      .expect(204);
    const cookies = (logout.headers["set-cookie"] as unknown as string[]) ?? [];
    // clearCookie emits a Set-Cookie with an expired Max-Age or Expires.
    const accessClear = cookies.find((c) => c.startsWith("pd_access="));
    const refreshClear = cookies.find((c) => c.startsWith("pd_refresh="));
    expect(accessClear).toMatch(/Expires=|Max-Age=0/);
    expect(refreshClear).toMatch(/Expires=|Max-Age=0/);
    // The refresh token from the now-revoked session no longer works.
    await api
      .post("/api/v1/tokens/refresh")
      .set("Cookie", `pd_refresh=${session.refreshToken}`)
      .expect(401);
  });

  test("is idempotent — second logout call still 204s", async () => {
    const session = await loginUserPair(api, "plainuser");
    await api
      .delete("/api/v1/tokens")
      .set("Cookie", `pd_refresh=${session.refreshToken}`)
      .expect(204);
    await api
      .delete("/api/v1/tokens")
      .set("Cookie", `pd_refresh=${session.refreshToken}`)
      .expect(204);
  });
});

describe("Admin revoke", () => {
  test("admin can revoke all sessions for another user", async () => {
    const adminToken = await loginUser(api, "admin");
    const targetA = await loginUserPair(api, "plainuser");
    const targetB = await loginUserPair(api, "plainuser");
    await api
      .delete("/api/v1/tokens/plainuser")
      .set("Cookie", `pd_access=${adminToken}`)
      .expect(204);
    await api
      .post("/api/v1/tokens/refresh")
      .send({ refreshToken: targetA.refreshToken })
      .expect(401);
    await api
      .post("/api/v1/tokens/refresh")
      .send({ refreshToken: targetB.refreshToken })
      .expect(401);
  });

  test("non-admin gets 403 trying to revoke another user", async () => {
    const otherToken = await loginUser(api, "simpleuser");
    await api
      .delete("/api/v1/tokens/plainuser")
      .set("Cookie", `pd_access=${otherToken}`)
      .expect(403);
  });
});
