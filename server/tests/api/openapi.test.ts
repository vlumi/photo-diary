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
  openapi: string;
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

  test("nothing the last release documented is broken, unless acknowledged", () => {
    const read = (name: string): unknown =>
      JSON.parse(
        readFileSync(resolve(import.meta.dirname, "../..", name), "utf8")
      );
    const released = read("openapi.released.json") as Record<string, unknown>;
    const acknowledged = read("openapi.breaks.json") as string[];
    // The iOS companion doesn't ship with the server, so an installed
    // app keeps calling what the last release documented. Additions
    // pass; see lib/openapi-compat.ts for what doesn't. A break is
    // allowed only on purpose: list its exact message in
    // openapi.breaks.json, in the same change that updates the app (or
    // confirms it is unaffected). The release empties that file when it
    // pins the new baseline.
    const found = findBreakingChanges(
      released,
      spec() as unknown as Record<string, unknown>
    );
    expect(found.filter((change) => !acknowledged.includes(change))).toEqual([]);
    // No stale entries: an acknowledged break that no longer happens
    // was either reverted or mistyped.
    expect(acknowledged.filter((change) => !found.includes(change))).toEqual([]);
  });

  test("every operation states the success it really sends", () => {
    // A route without a `response` gets the generator's placeholder,
    // "200 Default Response", whatever it answers. It also gets no
    // filtering: that is how a raw user row once went out.
    const undocumented = operations(spec())
      .filter(({ operation }) =>
        Object.entries(operation.responses).every(
          ([status, response]) =>
            !/^[23]/.test(status) ||
            // The placeholder is that text with nothing behind it; a
            // described body without a description of its own gets the
            // same text and is fine.
            ((response as { description?: string }).description ===
              "Default Response" &&
              !response.content &&
              !response.headers)
        )
      )
      .map(({ name }) => name);
    expect(undocumented).toEqual([]);
  });

  test("every operation has a unique, deliberate name", () => {
    const names = operations(spec()).map(({ name, operation }) => [
      name,
      (operation as { operationId?: string }).operationId,
    ]);
    expect(names.filter(([, id]) => !id).map(([name]) => name)).toEqual([]);
    const ids = names.map(([, id]) => id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test("it is OpenAPI 3.1, and null is written the 3.1 way", () => {
    expect(spec().openapi).toBe("3.1.0");
    const nullUnions: string[] = [];
    const visit = (value: unknown, path: string): void => {
      if (Array.isArray(value)) return value.forEach((v, i) => visit(v, `${path}[${i}]`));
      if (!value || typeof value !== "object") return;
      const node = value as Record<string, unknown>;
      if (node.type === "null") nullUnions.push(path);
      Object.entries(node).forEach(([k, v]) => visit(v, `${path}/${k}`));
    };
    visit(spec(), "");
    // A `{ type: "null" }` left inside an `anyOf` sits beside something
    // with structure; generators may drop it. Say so here if one is
    // ever deliberate.
    expect(nullUnions).toEqual([]);
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
      paths["/api/v1/users/self/password"]!.put!.responses["204"],
    ];
    for (const response of starters) {
      expect(response?.headers).toHaveProperty("Set-Cookie");
    }
    expect(paths["/api/v1/tokens/refresh"]!.post!.security).toEqual([
      { refreshCookie: [] },
    ]);
  });
});
