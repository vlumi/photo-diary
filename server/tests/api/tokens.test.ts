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
    expect(result.body.accessToken).toBeDefined();
    expect(typeof result.body.accessToken).toBe("string");
    expect(result.body.refreshToken).toBeDefined();
    expect(typeof result.body.refreshToken).toBe("string");
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
    const login = await api
      .post("/api/v1/tokens")
      .send({ id: "admin", password: "foobar" })
      .expect(200);
    // Identify by GET /api/v1/users which requires admin auth.
    await api
      .get("/api/v1/users")
      .set("Cookie", `pd_access=${login.body.accessToken}`)
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
  let token: string | undefined = undefined;
  beforeEach(async () => {
    token = await loginUser(api, "admin");
  });

  test("Success", async () => {
    await api
      .get("/api/v1/tokens")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
  });
});

describe("Refresh", () => {
  test("rotates the refresh token + returns a fresh access token", async () => {
    const pair = await loginUserPair(api, "admin");
    const refreshed = await api
      .post("/api/v1/tokens/refresh")
      .send({ refreshToken: pair.refreshToken })
      .expect(200);
    expect(refreshed.body.accessToken).toBeDefined();
    expect(refreshed.body.refreshToken).toBeDefined();
    expect(refreshed.body.refreshToken).not.toBe(pair.refreshToken);
    // Re-using the consumed refresh token fails.
    await api
      .post("/api/v1/tokens/refresh")
      .send({ refreshToken: pair.refreshToken })
      .expect(401);
  });

  test("rejects a malformed refresh token", async () => {
    await api
      .post("/api/v1/tokens/refresh")
      .send({ refreshToken: "not-a-pair" })
      .expect(401);
  });

  test("returns 401 when neither cookie nor body field carries a refresh token", async () => {
    // The body field is optional now (cookie-only clients hit /refresh
    // with no body), so a missing field falls through to the handler's
    // 401 path rather than short-circuiting on schema validation.
    await api.post("/api/v1/tokens/refresh").send({}).expect(401);
  });
  test("Cookie-only refresh rotates and re-sets the cookies", async () => {
    const pair = await loginUserPair(api, "admin");
    const refreshed = await api
      .post("/api/v1/tokens/refresh")
      .set("Cookie", `pd_refresh=${pair.refreshToken}`)
      .send({})
      .expect(200);
    const cookies = refreshed.headers["set-cookie"] as unknown as string[];
    expect(cookies.find((c) => c.startsWith("pd_access="))).toBeDefined();
    expect(cookies.find((c) => c.startsWith("pd_refresh="))).toBeDefined();
    expect(refreshed.body.refreshToken).not.toBe(pair.refreshToken);
  });
});

describe("Logout", () => {
  test("revokes only the calling session — other sessions stay valid", async () => {
    const sessionA = await loginUserPair(api, "plainuser");
    const sessionB = await loginUserPair(api, "plainuser");
    await api
      .delete("/api/v1/tokens")
      .set("Authorization", `Bearer ${sessionA.accessToken}`)
      .send({ refreshToken: sessionA.refreshToken })
      .expect(204);
    await api
      .post("/api/v1/tokens/refresh")
      .send({ refreshToken: sessionA.refreshToken })
      .expect(401);
    await api
      .post("/api/v1/tokens/refresh")
      .send({ refreshToken: sessionB.refreshToken })
      .expect(200);
  });

  test("Cookie-only logout revokes the session and clears the cookies", async () => {
    const session = await loginUserPair(api, "plainuser");
    const logout = await api
      .delete("/api/v1/tokens")
      .set("Cookie", `pd_access=${session.accessToken}; pd_refresh=${session.refreshToken}`)
      .send({})
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
      .send({ refreshToken: session.refreshToken })
      .expect(401);
  });

  test("is idempotent — second logout call still 204s", async () => {
    const session = await loginUserPair(api, "plainuser");
    await api
      .delete("/api/v1/tokens")
      .set("Authorization", `Bearer ${session.accessToken}`)
      .send({ refreshToken: session.refreshToken })
      .expect(204);
    await api
      .delete("/api/v1/tokens")
      .set("Authorization", `Bearer ${session.accessToken}`)
      .send({ refreshToken: session.refreshToken })
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
      .set("Authorization", `Bearer ${adminToken}`)
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
      .set("Authorization", `Bearer ${otherToken}`)
      .expect(403);
  });
});
