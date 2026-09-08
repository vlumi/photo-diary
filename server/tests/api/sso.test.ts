import { vi } from "vitest";
import { TEST_CONFIG, seedApiFixture } from "./fixture.js";

vi.mock("../../lib/config/index.js", () => ({ default: TEST_CONFIG }));

import { init } from "../../app.js";
import { createApi, loginUser } from "./helper.js";

const { api } = createApi();

// Mint validates the target against instance_knownHosts. Supertest
// reports the bound `127.0.0.1` as request.hostname, and the SPA's
// cross-host flow would set the target hostname literally — seed
// the matching meta + a couple of others the negative cases need.
const seedKnownHosts = async () => {
  const { default: db } = await import("../../db/index.js");
  await db.createMeta({
    key: "instance_knownHosts",
    value: JSON.stringify([
      { hostname: "127.0.0.1", label: "Self", isMain: true },
      { hostname: "photos.example.com", label: "Photos" },
      { hostname: "elsewhere.example.com", label: "Elsewhere" },
    ]),
  });
};

beforeEach(async () => {
  await seedApiFixture();
  await init();
  await seedKnownHosts();
});

// Pull the access cookie out of a Set-Cookie response. Used for the
// "authed call" branches that need to send a cookie back manually.
const accessCookieFrom = (response: {
  headers: Record<string, unknown>;
}): string => {
  const cookies = response.headers["set-cookie"] as unknown as string[];
  const access = cookies.find((c) => c.startsWith("pd_access="));
  if (!access) throw new Error("no pd_access cookie on response");
  return access;
};

describe("Cross-host SSO mint", () => {
  test("authed admin mints a token + gets a redirectUrl to the target host", async () => {
    const token = await loginUser(api, "admin");
    const res = await api
      .post("/api/v1/tokens/cross-host")
      .set("Cookie", `pd_access=${token}`)
      .send({ target: "photos.example.com", path: "/g" })
      .expect(200);
    expect(typeof res.body.redirectUrl).toBe("string");
    expect(res.body.redirectUrl).toMatch(
      /^https:\/\/photos\.example\.com\/api\/v1\/tokens\/sso\?token=/
    );
    expect(res.body.redirectUrl).toContain("redirect=%2Fg");
  });

  test("guest can't mint (gets a non-2xx)", async () => {
    await api
      .post("/api/v1/tokens/cross-host")
      .send({ target: "photos.example.com" })
      .expect((res) => {
        if (res.status === 200) {
          throw new Error("guest unexpectedly minted an SSO token");
        }
      });
  });

  test("target not in knownHosts is rejected", async () => {
    const token = await loginUser(api, "admin");
    await api
      .post("/api/v1/tokens/cross-host")
      .set("Cookie", `pd_access=${token}`)
      .send({ target: "evil.example.com" })
      .expect((res) => {
        if (res.status === 200) {
          throw new Error("unknown target unexpectedly succeeded");
        }
      });
  });

  test("a path that isn't absolute falls back to '/'", async () => {
    const token = await loginUser(api, "admin");
    const res = await api
      .post("/api/v1/tokens/cross-host")
      .set("Cookie", `pd_access=${token}`)
      .send({ target: "photos.example.com", path: "javascript:alert(1)" })
      .expect(200);
    expect(res.body.redirectUrl).toContain("redirect=%2F");
    // Mustn't leak the dangerous path into the redirect param.
    expect(res.body.redirectUrl).not.toContain("javascript");
  });
});

describe("Cross-host SSO consume", () => {
  // Helper: mint a token via the API (so we don't have to recreate
  // the signing logic here) and return the raw token string.
  const mintTokenFor = async (
    userId: string,
    target: string
  ): Promise<string> => {
    const access = await loginUser(api, userId);
    const res = await api
      .post("/api/v1/tokens/cross-host")
      .set("Cookie", `pd_access=${access}`)
      .send({ target, path: "/g" })
      .expect(200);
    const url = new URL(res.body.redirectUrl);
    const tok = url.searchParams.get("token");
    if (!tok) throw new Error("mint response had no token");
    return tok;
  };

  test("valid token + matching audience: sets cookies + 302s to the redirect path", async () => {
    // The supertest request goes against `127.0.0.1` (the bound
    // ephemeral host); the SSO token must claim that audience to
    // verify. Mint via the same endpoint with that target.
    const token = await mintTokenFor("admin", "127.0.0.1");
    const res = await api
      .get(
        `/api/v1/tokens/sso?token=${encodeURIComponent(token)}&redirect=${encodeURIComponent("/g/dailybw")}`
      )
      .expect(302);
    expect(res.headers["location"]).toBe("/g/dailybw");
    const cookies = res.headers["set-cookie"] as unknown as string[];
    expect(cookies.find((c) => c.startsWith("pd_access="))).toBeDefined();
    expect(cookies.find((c) => c.startsWith("pd_refresh="))).toBeDefined();
  });

  test("replay (same jti twice) — second consume fails with 401", async () => {
    const token = await mintTokenFor("admin", "127.0.0.1");
    await api
      .get(`/api/v1/tokens/sso?token=${encodeURIComponent(token)}`)
      .expect(302);
    await api
      .get(`/api/v1/tokens/sso?token=${encodeURIComponent(token)}`)
      .expect(401);
  });

  test("audience mismatch — token bound to a different host is rejected", async () => {
    const token = await mintTokenFor("admin", "elsewhere.example.com");
    await api
      .get(`/api/v1/tokens/sso?token=${encodeURIComponent(token)}`)
      .expect(401);
  });

  test("malformed / unsigned token is rejected", async () => {
    await api
      .get(`/api/v1/tokens/sso?token=${encodeURIComponent("not.a.real.jwt")}`)
      .expect(401);
  });

  test("redirect param that isn't an absolute path falls back to '/'", async () => {
    const token = await mintTokenFor("admin", "127.0.0.1");
    const res = await api
      .get(
        `/api/v1/tokens/sso?token=${encodeURIComponent(token)}&redirect=${encodeURIComponent("https://attacker.example/steal")}`
      )
      .expect(302);
    expect(res.headers["location"]).toBe("/");
  });

  test("stale pd_access on the target host doesn't block the SSO consume", async () => {
    // Regression: /api/v1/tokens/sso is the recovery path a cross-host
    // hop uses to establish a fresh session on the target host. If the
    // browser still holds a stale/expired pd_access cookie from an
    // earlier session there, tokenFilter used to 401 before /sso ran
    // — the user saw raw `{"error":"Token expired"}` JSON on the
    // target host's URL bar after clicking the UserMenu host link.
    const token = await mintTokenFor("admin", "127.0.0.1");
    const res = await api
      .get(
        `/api/v1/tokens/sso?token=${encodeURIComponent(token)}&redirect=${encodeURIComponent("/g/dailybw")}`
      )
      .set("Cookie", "pd_access=eyJmYWtl.fake.token")
      .expect(302);
    expect(res.headers["location"]).toBe("/g/dailybw");
  });

  test("session cookies issued by the consume verify on the next request", async () => {
    const token = await mintTokenFor("admin", "127.0.0.1");
    const ssoRes = await api
      .get(`/api/v1/tokens/sso?token=${encodeURIComponent(token)}`)
      .expect(302);
    const access = accessCookieFrom(ssoRes);
    await api
      .get("/api/v1/tokens")
      .set("Cookie", access)
      .expect(200);
  });
});

describe("Device pairing mint", () => {
  test("authed user gets a ticket for the main host, expiring ~2 min out", async () => {
    // seedKnownHosts marks 127.0.0.1 as isMain.
    const access = await loginUser(api, "admin");
    const before = Date.now();
    const res = await api
      .post("/api/v1/tokens/pairing")
      .set("Cookie", `pd_access=${access}`)
      .send({})
      .expect(200);
    expect(typeof res.body.token).toBe("string");
    expect(res.body.host).toBe("127.0.0.1");
    expect(res.body.scheme).toBe("http");
    expect(res.body.expiresAt).toBeGreaterThanOrEqual(before + 120_000 - 2_000);
    expect(res.body.expiresAt).toBeLessThanOrEqual(Date.now() + 120_000 + 2_000);
  });

  test("ticket targets the configured main host even when minted from a vhost", async () => {
    const { default: db } = await import("../../db/index.js");
    await db.updateMeta("instance_knownHosts", {
      value: JSON.stringify([
        { hostname: "photos.example.com", label: "Main", isMain: true },
        { hostname: "127.0.0.1", label: "Self" },
      ]),
    });
    const access = await loginUser(api, "admin");
    const res = await api
      .post("/api/v1/tokens/pairing")
      .set("Cookie", `pd_access=${access}`)
      .send({})
      .expect(200);
    expect(res.body.host).toBe("photos.example.com");
    // Bound to the main host: this host (127.0.0.1) can't consume it.
    await api
      .get(`/api/v1/tokens/sso?token=${encodeURIComponent(res.body.token)}`)
      .expect(401);
  });

  test("without a main host the ticket targets the request's host, port included", async () => {
    const { default: db } = await import("../../db/index.js");
    await db.deleteMeta("instance_knownHosts");
    const access = await loginUser(api, "admin");
    const res = await api
      .post("/api/v1/tokens/pairing")
      .set("Cookie", `pd_access=${access}`)
      .send({})
      .expect(200);
    expect(res.body.host).toMatch(/^127\.0\.0\.1:\d+$/);
    // Audience is the hostname alone, so the round trip still works.
    await api
      .get(`/api/v1/tokens/sso?token=${encodeURIComponent(res.body.token)}`)
      .expect(302);
  });

  test("guest can't mint", async () => {
    await api.post("/api/v1/tokens/pairing").send({}).expect(403);
  });

  test("ticket round-trips through /sso: cookies issued, second consume is a replay", async () => {
    const access = await loginUser(api, "admin");
    const res = await api
      .post("/api/v1/tokens/pairing")
      .set("Cookie", `pd_access=${access}`)
      .send({})
      .expect(200);
    const consume = await api
      .get(`/api/v1/tokens/sso?token=${encodeURIComponent(res.body.token)}`)
      .expect(302);
    const cookies = consume.headers["set-cookie"] as unknown as string[];
    expect(cookies.find((c) => c.startsWith("pd_access="))).toBeDefined();
    expect(cookies.find((c) => c.startsWith("pd_refresh="))).toBeDefined();
    await api
      .get(`/api/v1/tokens/sso?token=${encodeURIComponent(res.body.token)}`)
      .expect(401);
  });

  test("consumed jti stays blocked past the cross-host window for the full pairing TTL", async () => {
    // Regression guard for the retention window: pruning by the 30 s
    // cross-host TTL would have let a 2 min pairing ticket replay
    // once its row aged out.
    const { default: db } = await import("../../db/index.js");
    const { SSO_JTI_RETENTION_MS, SSO_TOKEN_TTL_MS, PAIRING_TOKEN_TTL_MS } =
      await import("../../lib/sso.js");
    const t0 = Date.now();
    expect(await db.consumeSsoJti("pairing-jti", t0, SSO_JTI_RETENTION_MS)).toBe(true);
    const insideWindow = t0 + SSO_TOKEN_TTL_MS + 1_000;
    expect(insideWindow).toBeLessThan(t0 + PAIRING_TOKEN_TTL_MS);
    expect(await db.consumeSsoJti("pairing-jti", insideWindow, SSO_JTI_RETENTION_MS)).toBe(false);
  });

  test("'New code' with the previous ticket revokes it: old consume 401, new consume 302", async () => {
    const access = await loginUser(api, "admin");
    const first = await api
      .post("/api/v1/tokens/pairing")
      .set("Cookie", `pd_access=${access}`)
      .send({})
      .expect(200);
    const second = await api
      .post("/api/v1/tokens/pairing")
      .set("Cookie", `pd_access=${access}`)
      .send({ previous: first.body.token })
      .expect(200);
    expect(second.body.token).not.toBe(first.body.token);
    await api
      .get(`/api/v1/tokens/sso?token=${encodeURIComponent(first.body.token)}`)
      .expect(401);
    await api
      .get(`/api/v1/tokens/sso?token=${encodeURIComponent(second.body.token)}`)
      .expect(302);
  });

  test("previous ticket belonging to another user is refused", async () => {
    const other = await loginUser(api, "plainuser");
    const theirs = await api
      .post("/api/v1/tokens/pairing")
      .set("Cookie", `pd_access=${other}`)
      .send({})
      .expect(200);
    const access = await loginUser(api, "admin");
    await api
      .post("/api/v1/tokens/pairing")
      .set("Cookie", `pd_access=${access}`)
      .send({ previous: theirs.body.token })
      .expect(403);
    // Their ticket is untouched by the refused attempt.
    await api
      .get(`/api/v1/tokens/sso?token=${encodeURIComponent(theirs.body.token)}`)
      .expect(302);
  });

  test("malformed previous is ignored — nothing to revoke", async () => {
    const access = await loginUser(api, "admin");
    await api
      .post("/api/v1/tokens/pairing")
      .set("Cookie", `pd_access=${access}`)
      .send({ previous: "not.a.real.jwt" })
      .expect(200);
  });
});
