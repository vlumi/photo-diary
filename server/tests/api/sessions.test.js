"use strict";

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
      .expect(401);
  });
  test("Wrong password", async () => {
    await api
      .post("/api/sessions")
      .send({
        username: "admin",
        password: "wrong",
      })
      .expect(401);
  });
  test("Successful login", async () => {
    const result = await api
      .post("/api/sessions")
      .send({
        username: "admin",
        password: "foobar",
      })
      .expect(204);
    const cookies = parseCookies(result.headers["set-cookie"]);
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
    await api
      .get("/api/sessions")
      .set("Cookie", [`token=${token}`])
      .expect(200);
  });
});
describe("Logout", () => {
  let token = undefined;
  beforeEach(async () => {
    token = await loginUser(api, "admin");
  });

  test("Success", async () => {
    await api
      .get("/api/sessions")
      .set("Cookie", [`token=${token}`])
      .expect(200);
    await api
      .delete("/api/sessions")
      .set("Cookie", [`token=${token}`])
      .expect(204);
    await api
      .get("/api/sessions")
      .set("Cookie", [`token=${token}`])
      .expect(401);
  });
});
describe("Revoke", () => {
  let tokens = [];
  beforeEach(async () => {
    tokens = [
      await loginUser(api, "plainUser"),
      await loginUser(api, "plainUser"),
      await loginUser(api, "plainUser"),
    ];
  });

  test("Self", async () => {
    Promise.all(
      tokens.map(async (token) => {
        api
          .get("/api/sessions")
          .set("Cookie", [`token=${token}`])
          .expect(200);
      })
    );
    await api
      .post("/api/sessions")
      .send({
        username: "plainUser",
        password: "foobar",
      })
      .set("Cookie", [`token=${tokens[0]}`])
      .expect(204);
    Promise.all(
      tokens.map((token) => {
        api
          .get("/api/sessions")
          .set("Cookie", [`token=${token}`])
          .expect(401);
      })
    );
  });
  test("By admin", async () => {
    const adminToken = await loginUser(api, "admin");
    Promise.all(
      tokens.map(async (token) => {
        api
          .get("/api/sessions")
          .set("Cookie", [`token=${token}`])
          .expect(200);
      })
    );
    await api
      .post("/api/sessions/revoke-all")
      .send({
        username: "plainUser",
        password: "",
      })
      .set("Cookie", [`token=${adminToken}`])
      .expect(204);
    await api
      .post("/api/sessions/revoke-all")
      .send({
        username: "plainUser",
        password: "",
      })
      .set("Cookie", [`token=${tokens[0]}`])
      .expect(401);
    Promise.all(
      tokens.map((token) => {
        api
          .get("/api/sessions")
          .set("Cookie", [`token=${token}`])
          .expect(401);
      })
    );
  });
});

afterAll(() => {});
