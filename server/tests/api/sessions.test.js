const supertest = require("supertest");
const { app, init } = require("../../app");

const api = supertest(app);
const { loginUser } = require("./helper");

beforeEach(async () => {
  await init();
});

describe("Login", () => {
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
      .expect(200);
    expect(result.body.token).toBeDefined();
  });
});
describe("Keep-alive", () => {
  let token = undefined;
  beforeEach(async () => {
    token = await loginUser(api, "admin");
  });

  test("Success", async () => {
    await api
      .get("/api/sessions")
      .set("Authorization", `Bearer ${token}`)
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
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    await api
      .delete("/api/sessions/admin")
      .set("Authorization", `Bearer ${token}`)
      .expect(204);
    await api
      .get("/api/sessions")
      .set("Authorization", `Bearer ${token}`)
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
          .set("Authorization", `Bearer ${token}`)
          .expect(200);
      })
    );
    await api
      .delete("/api/sessions/plainUser")
      .set("Authorization", `Bearer ${tokens[0]}`)
      .expect(204);
    Promise.all(
      tokens.map((token) => {
        api
          .get("/api/sessions")
          .set("Authorization", `Bearer ${token}`)
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
          .set("Authorization", `Bearer ${token}`)
          .expect(200);
      })
    );
    await api
      .delete("/api/sessions/plainUser")
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(204);
    Promise.all(
      tokens.map((token) => {
        api
          .get("/api/sessions")
          .set("Authorization", `Bearer ${token}`)
          .expect(401);
      })
    );
  });
  test("By non-admin", async () => {
    const otherToken = await loginUser(api, "simpleUser");
    Promise.all(
      tokens.map(async (token) => {
        api
          .get("/api/sessions")
          .set("Authorization", `Bearer ${token}`)
          .expect(200);
      })
    );
    await api
      .delete("/api/sessions/plainUser")
      .set("Authorization", `Bearer ${otherToken}`)
      .expect(403);
    Promise.all(
      tokens.map((token) => {
        api
          .get("/api/sessions")
          .set("Authorization", `Bearer ${token}`)
          .expect(401);
      })
    );
  });
});
