import { init } from "../../app.js";
import { _resetLoginRateLimitForTests } from "../../controllers/tokens-v1.js";
import { createApi, loginUser, loginUserPair } from "./helper.js";

const { api, close } = createApi();

beforeEach(async () => {
  await init();
  // The login throttle holds in-memory per-IP failure counts that persist
  // across tests (supertest always connects from 127.0.0.1, so every test
  // shares one IP key). Reset between tests so each scenario starts fresh.
  _resetLoginRateLimitForTests();
});

afterAll(close);

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

describe('Refresh', () => {
  test('rotates the refresh token + returns a fresh access token', async () => {
    const pair = await loginUserPair(api, 'admin');
    const refreshed = await api
      .post('/api/v1/tokens/refresh')
      .send({ refreshToken: pair.refreshToken })
      .expect(200);
    expect(refreshed.body.accessToken).toBeDefined();
    expect(refreshed.body.refreshToken).toBeDefined();
    expect(refreshed.body.refreshToken).not.toBe(pair.refreshToken);
    // Re-using the consumed refresh token fails.
    await api
      .post('/api/v1/tokens/refresh')
      .send({ refreshToken: pair.refreshToken })
      .expect(401);
  });

  test('rejects a malformed refresh token', async () => {
    await api
      .post('/api/v1/tokens/refresh')
      .send({ refreshToken: 'not-a-pair' })
      .expect(401);
  });

  test('returns 400 when the refresh-token body field is missing', async () => {
    // Body shape is enforced by the typebox schema before the handler runs,
    // so a missing field short-circuits as a 400 — never reaches the
    // controller's defensive 401 fallback.
    await api.post('/api/v1/tokens/refresh').send({}).expect(400);
  });
});

describe('Logout', () => {
  test('revokes only the calling session — other sessions stay valid', async () => {
    const sessionA = await loginUserPair(api, 'plainUser');
    const sessionB = await loginUserPair(api, 'plainUser');
    await api
      .delete('/api/v1/tokens')
      .set('Authorization', `Bearer ${sessionA.accessToken}`)
      .send({ refreshToken: sessionA.refreshToken })
      .expect(204);
    await api
      .post('/api/v1/tokens/refresh')
      .send({ refreshToken: sessionA.refreshToken })
      .expect(401);
    await api
      .post('/api/v1/tokens/refresh')
      .send({ refreshToken: sessionB.refreshToken })
      .expect(200);
  });

  test('is idempotent — second logout call still 204s', async () => {
    const session = await loginUserPair(api, 'plainUser');
    await api
      .delete('/api/v1/tokens')
      .set('Authorization', `Bearer ${session.accessToken}`)
      .send({ refreshToken: session.refreshToken })
      .expect(204);
    await api
      .delete('/api/v1/tokens')
      .set('Authorization', `Bearer ${session.accessToken}`)
      .send({ refreshToken: session.refreshToken })
      .expect(204);
  });
});

describe('Admin revoke', () => {
  test('admin can revoke all sessions for another user', async () => {
    const adminToken = await loginUser(api, 'admin');
    const targetA = await loginUserPair(api, 'plainUser');
    const targetB = await loginUserPair(api, 'plainUser');
    await api
      .delete('/api/v1/tokens/plainUser')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(204);
    await api
      .post('/api/v1/tokens/refresh')
      .send({ refreshToken: targetA.refreshToken })
      .expect(401);
    await api
      .post('/api/v1/tokens/refresh')
      .send({ refreshToken: targetB.refreshToken })
      .expect(401);
  });

  test('non-admin gets 403 trying to revoke another user', async () => {
    const otherToken = await loginUser(api, 'simpleUser');
    await api
      .delete('/api/v1/tokens/plainUser')
      .set('Authorization', `Bearer ${otherToken}`)
      .expect(403);
  });
});
