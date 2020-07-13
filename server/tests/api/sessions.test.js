const supertest = require("supertest");
const app = require("../../app");

const api = supertest(app);
const { parseCookies } = require("./helper");

beforeEach(async () => {});

describe("Login", () => {
  beforeEach(async () => {});

  test("Non-existing user", async () => {
    await api
      .post("/api/sessions")
      .send({
        username: "wrong",
        password: "wrong",
      })
      .expect(403);
  });
  test("Wrong password", async () => {
    await api
      .post("/api/sessions")
      .send({
        username: "admin",
        password: "wrong",
      })
      .expect(403);
  });
  test("Successful login", async () => {
    const res = await api
      .post("/api/sessions")
      .send({
        username: "admin",
        password: "foobar",
      })
      .expect(204);
    const cookies = parseCookies(res.headers["set-cookie"]);
    expect(cookies.token).toBeDefined();
  });

  afterAll(() => {});
});

afterAll(() => {});
