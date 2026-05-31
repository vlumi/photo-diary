import { init } from "../../app.js";
import dummyFactory from "../../db/dummy.js";
import { createApi, loginUser } from "./helper.js";

const db = dummyFactory();

const { api, close } = createApi();

beforeEach(async () => {
  await db.init();
  await init();
});

afterAll(close);

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

describe("As non-admin", () => {
  let token: string;
  beforeEach(async () => {
    token = await loginUser(api, "gallery1Admin");
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
