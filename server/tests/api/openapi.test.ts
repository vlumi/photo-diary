import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { vi } from "vitest";
import { TEST_CONFIG, seedApiFixture } from "./fixture.js";

vi.mock("../../lib/config/index.js", () => ({ default: TEST_CONFIG }));

import { app, init } from "../../app.js";
import { findBreakingChanges } from "../../lib/openapi-compat.js";
import { createApi } from "./helper.js";

const { api } = createApi();

beforeEach(async () => {
  await seedApiFixture();
  await init();
});

type Operation = {
  security?: Record<string, string[]>[];
  responses: Record<string, { headers?: object; content?: object }>;
};
type Spec = {
  info: { version: string };
  paths: Record<string, Record<string, Operation>>;
  components: { securitySchemes: Record<string, { in?: string; name?: string }> };
};

const METHODS = ["get", "post", "put", "patch", "delete"];
const spec = () => app.swagger() as unknown as Spec;
const operations = (s: Spec) =>
  Object.entries(s.paths).flatMap(([path, byMethod]) =>
    Object.entries(byMethod)
      .filter(([method]) => METHODS.includes(method))
      .map(([method, operation]) => ({
        name: `${method.toUpperCase()} ${path}`,
        operation,
      }))
  );

describe("OpenAPI document", () => {
  test("the committed copy matches what the routes generate", () => {
    const committed = JSON.parse(
      readFileSync(resolve(import.meta.dirname, "../../openapi.json"), "utf8")
    ) as Spec;
    const live = structuredClone(spec());
    // The version is stamped by the release; everything else must match.
    live.info.version = committed.info.version;
    // Stale? Run `npm run docs:dump` in server/, then `npm run api:codegen`
    // in react-app/.
    expect(committed).toEqual(live);
  });

  test("nothing the last release documented is broken", () => {
    const released = JSON.parse(
      readFileSync(
        resolve(import.meta.dirname, "../../openapi.released.json"),
        "utf8"
      )
    ) as Record<string, unknown>;
    // The iOS companion doesn't ship with the server: an installed app
    // keeps calling what the last release documented. Additions pass;
    // see lib/openapi-compat.ts for what doesn't. A deliberate break
    // means a new API version, not an edit to this test.
    expect(
      findBreakingChanges(released, spec() as unknown as Record<string, unknown>)
    ).toEqual([]);
  });

  test("auth is described as the two cookies the server reads", () => {
    expect(spec().components.securitySchemes).toMatchObject({
      accessCookie: { in: "cookie", name: "pd_access" },
      refreshCookie: { in: "cookie", name: "pd_refresh" },
    });
    expect(Object.keys(spec().components.securitySchemes)).toHaveLength(2);
  });

  test("every security requirement names a declared scheme", () => {
    const declared = Object.keys(spec().components.securitySchemes);
    for (const { name, operation } of operations(spec())) {
      for (const requirement of operation.security ?? []) {
        for (const scheme of Object.keys(requirement)) {
          expect(declared, name).toContain(scheme);
        }
      }
    }
  });

  test("401 is documented everywhere but the endpoints that ignore a stale cookie", () => {
    const without = operations(spec())
      .filter(({ operation }) => !("401" in operation.responses))
      .map(({ name }) => name)
      .sort();
    expect(without).toEqual([
      "DELETE /api/v1/tokens",
      "GET /api/v1/meta",
      "GET /api/v1/meta/{key}",
    ]);
  });

  test("a stale access cookie is refused even where a guest may read, as documented", async () => {
    const galleries = spec().paths["/api/v1/galleries"]!.get!;
    expect(galleries.security).toEqual([{}, { accessCookie: [] }]);
    await api.get("/api/v1/galleries").expect(200);
    const refused = await api
      .get("/api/v1/galleries")
      .set("Cookie", "pd_access=not-a-token")
      .expect(401);
    expect(refused.body).toEqual({ error: expect.any(String) });
    await api
      .get("/api/v1/meta")
      .set("Cookie", "pd_access=not-a-token")
      .expect(200);
  });

  test("logout is a bodiless 204 that clears the cookies, with or without a session", async () => {
    const logout = spec().paths["/api/v1/tokens"]!.delete!;
    expect(logout.security).toEqual([{}, { refreshCookie: [] }]);
    expect(Object.keys(logout.responses)).toEqual(["204"]);
    expect(logout.responses["204"]!.headers).toHaveProperty("Set-Cookie");
    expect(logout.responses["204"]!.content).toBeUndefined();
    const response = await api.delete("/api/v1/tokens").expect(204);
    expect(response.headers["set-cookie"]).toBeDefined();
  });

  test("the responses that start a session document their cookies", () => {
    const paths = spec().paths;
    const starters = [
      paths["/api/v1/tokens"]!.post!.responses["200"],
      paths["/api/v1/tokens/refresh"]!.post!.responses["200"],
      paths["/api/v1/tokens/sso"]!.get!.responses["302"],
      paths["/api/v1/users/self/password"]!.put!.responses["200"],
    ];
    for (const response of starters) {
      expect(response?.headers).toHaveProperty("Set-Cookie");
    }
    expect(paths["/api/v1/tokens/refresh"]!.post!.security).toEqual([
      { refreshCookie: [] },
    ]);
  });
});
