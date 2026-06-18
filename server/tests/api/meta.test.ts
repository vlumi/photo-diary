import { vi } from "vitest";
import { TEST_CONFIG, seedApiFixture } from "./fixture.js";

vi.mock("../../lib/config/index.js", () => ({ default: TEST_CONFIG }));

import { init } from "../../app.js";
import { createApi, loginUser } from "./helper.js";

const { api } = createApi();

beforeEach(async () => {
  await seedApiFixture();
  await init();
});


const getMetas = async (status = 200) =>
  api
    .get("/api/v1/meta")
    .expect(status);

const getMeta = async (key: string, status = 200) =>
  api
    .get(`/api/v1/meta/${key}`)
    .expect(status);

const expectMeta = (result: { body: Record<string, unknown> }, key: string, value: unknown) => {
  expect(result.body[key]).toBeDefined();
  expect(result.body[key]).toBe(value);
};

describe("As guest", () => {
  test("List meta", async () => {
    const result = await getMetas();
    expect(Object.keys(result.body).length).toBe(4);
    expectMeta(result, "name", "dummy instance");
    expectMeta(result, "description", "dummy instance for automated tests");
    expectMeta(result, "cdn", "http://localhost");
    expectMeta(result, "image", "dummy.jpg");
  });
  test("Get name", async () => {
    const result = await getMeta("name");
    expect(result.body.name).toBeDefined();
    expect(result.body.name).toBe("dummy instance");
  });
  test("Create rejected", () =>
    api
      .post("/api/v1/meta")
      .send({ key: "name", value: "v" })
      .expect(403));
  test("Update rejected", () =>
    api.put("/api/v1/meta/name").send({ value: "renamed" }).expect(403));
  test("Delete rejected", () => api.delete("/api/v1/meta/name").expect(403));
});

describe("As admin", () => {
  let token: string;
  beforeEach(async () => {
    token = await loginUser(api, "admin");
  });

  test("Create after delete", async () => {
    // The dummy seeds all four known keys; clear one so POST creates.
    await api
      .delete("/api/v1/meta/cdn")
      .set("Authorization", `Bearer ${token}`)
      .expect(204);
    await api
      .post("/api/v1/meta")
      .set("Authorization", `Bearer ${token}`)
      .send({ key: "cdn", value: "https://cdn.example" })
      .expect(201);
    const result = await getMeta("cdn");
    expectMeta(result, "cdn", "https://cdn.example");
  });
  test("Create with unknown key → 400", () =>
    api
      .post("/api/v1/meta")
      .set("Authorization", `Bearer ${token}`)
      .send({ key: "schema_version", value: "999" })
      .expect(400));
  test("Update with unknown key → 400", () =>
    api
      .put("/api/v1/meta/schema_version")
      .set("Authorization", `Bearer ${token}`)
      .send({ value: "999" })
      .expect(400));
  test("Delete with unknown key → 400", () =>
    api
      .delete("/api/v1/meta/schema_version")
      .set("Authorization", `Bearer ${token}`)
      .expect(400));
  test("Get with unknown key → 400", () => getMeta("schema_version", 400));
  test("Update existing meta", async () => {
    await api
      .put("/api/v1/meta/name")
      .set("Authorization", `Bearer ${token}`)
      .send({ value: "renamed instance" })
      .expect(204);
    const result = await getMeta("name");
    expectMeta(result, "name", "renamed instance");
  });
  test("Delete existing meta", async () => {
    await api
      .delete("/api/v1/meta/name")
      .set("Authorization", `Bearer ${token}`)
      .expect(204);
    await getMeta("name", 404);
  });
  test("Create with invalid body → 400", () =>
    api
      .post("/api/v1/meta")
      .set("Authorization", `Bearer ${token}`)
      .send({ value: "v" })
      .expect(400));
  test("Update with invalid body → 400", () =>
    api
      .put("/api/v1/meta/name")
      .set("Authorization", `Bearer ${token}`)
      .send({})
      .expect(400));
});

describe("SPA runtime defaults", () => {
  let token: string;
  beforeEach(async () => {
    token = await loginUser(api, "admin");
  });

  test("Newly accepted keys round-trip through POST/GET", async () => {
    await api
      .post("/api/v1/meta")
      .set("Authorization", `Bearer ${token}`)
      .send({ key: "defaultTheme", value: "grayscale" })
      .expect(201);
    const result = await getMetas();
    expectMeta(result, "defaultTheme", "grayscale");
  });

  test("Meta row is the source of truth for SPA runtime defaults", async () => {
    // The meta row is the only source; unset keys fall through to
    // the SPA's bundled defaults in `lib/config.ts` (handled
    // client-side, not by this endpoint).
    await api
      .post("/api/v1/meta")
      .set("Authorization", `Bearer ${token}`)
      .send({ key: "defaultGallery", value: "gallery1" })
      .expect(201);
    const result = await getMetas();
    expectMeta(result, "defaultGallery", "gallery1");
  });

  test("betaFeatures stored as JSON, returned as parsed map", async () => {
    await api
      .post("/api/v1/meta")
      .set("Authorization", `Bearer ${token}`)
      .send({
        key: "betaFeatures",
        value: JSON.stringify({ regions: "on", focalLengthEquiv: "user" }),
      })
      .expect(201);
    const result = await getMetas();
    expect(result.body.betaFeatures).toEqual({
      regions: "on",
      focalLengthEquiv: "user",
    });
  });

  test("Malformed JSON in betaFeatures row is dropped from GET (not surfaced as string)", async () => {
    // bin/meta.ts --force could plant a malformed value; the API
    // must not crash on read.
    await api
      .post("/api/v1/meta")
      .set("Authorization", `Bearer ${token}`)
      .send({ key: "betaFeatures", value: "{not json" })
      .expect(201);
    const result = await getMetas();
    expect(result.body.betaFeatures).toBeUndefined();
  });
});

describe("As non-admin", () => {
  let token: string;
  beforeEach(async () => {
    token = await loginUser(api, "gallery1admin");
  });
  test("Create rejected", () =>
    api
      .post("/api/v1/meta")
      .set("Authorization", `Bearer ${token}`)
      .send({ key: "name", value: "v" })
      .expect(403));
  test("Update rejected", () =>
    api
      .put("/api/v1/meta/name")
      .set("Authorization", `Bearer ${token}`)
      .send({ value: "renamed" })
      .expect(403));
  test("Delete rejected", () =>
    api
      .delete("/api/v1/meta/name")
      .set("Authorization", `Bearer ${token}`)
      .expect(403));
});
