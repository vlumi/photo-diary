const supertest = require("supertest");
const { app, init } = require("../../app");

const api = supertest(app);
const db = require("../../db/dummy")();
const { loginUser } = require("./helper");

beforeEach(async () => {
  await db.init();
  await init();
});

const getMetas = async (status = 200) =>
  api
    .get("/api/v1/meta")
    .expect(status);

const getMeta = async (key, status = 200) =>
  api
    .get(`/api/v1/meta/${key}`)
    .expect(status);

const expectMeta = (result, key, value) => {
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
});

afterAll(() => {});
