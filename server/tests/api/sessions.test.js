const supertest = require("supertest");
const app = require("../../app");

const api = supertest(app);
const { parseCookies, loginUser } = require("./helper");

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
describe("Keep-alive", () => {
  let token = undefined;
  beforeEach(async () => {
    token = await loginUser(api, "admin");
  });

  test("Success", async () => {
    const res = await api
      .get("/api/sessions")
      .set("Cookie", [`token=${token}`])
      .expect(200);
  });
});

afterAll(() => {});
