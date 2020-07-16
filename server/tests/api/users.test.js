const supertest = require("supertest");
const { app, init } = require("../../app");

const api = supertest(app);
const db = require("../../db/dummy")();
const { loginUser } = require("./helper");

beforeEach(async () => {
  await db.init();
  await init();
});

const getUsers = async (token, status = 200) =>
  api.get("/api/users").set("Authorization", `Bearer ${token}`).expect(status);

const getUser = async (token, username, status = 200) =>
  api
    .get(`/api/users/${username}`)
    .set("Authorization", `Bearer ${token}`)
    .expect(status);

describe("As Guest", () => {
  test("Get users", async () => {
    await api.get("/api/users").expect(403);
  });
  test("Get admin", async () => {
    await api.get("/api/users/admin").expect(403);
  });
});

describe("As admin", () => {
  let token = undefined;
  beforeAll(async () => {
    token = await loginUser(api, "admin");
  });

  test("Get users", async () => {
    const response = await getUsers(token);
    const users = response.body;
    expect(users).toBeDefined();
    expect(users.length).toBe(9);
    const admin = users.find((user) => user.username === "admin");
    expect(admin).toBeDefined();
    expect(admin.username).toBe("admin");
    expect(admin.password).not.toBeDefined();
    users.forEach((user) => {
      expect(user).toBeDefined();
      expect(Object.keys(user).length).toBe(1);
      expect(user.username).toBeDefined();
      expect(user.password).not.toBeDefined();
    });
  });
  test("Get admin", async () => {
    await getUser(token, "admin");
  });
  test("Get plainUser", async () => {
    await getUser(token, "plainUser");
  });
  test("Get invalid", async () => {
    await getUser(token, "invalid", 404);
  });
});

describe("As gallery1Admin", () => {
  let token = undefined;
  beforeAll(async () => {
    token = await loginUser(api, "gallery1Admin");
  });

  test("Get users", async () => {
    await getUsers(token, 403);
  });
  test("Get admin", async () => {
    await getUser(token, "admin", 403);
  });
  test("Get plainUser", async () => {
    await getUser(token, "plainUser", 403);
  });
  test("Get invalid", async () => {
    await getUser(token, "invalid", 403);
  });
});

describe("As gallery2Admin", () => {
  let token = undefined;
  beforeAll(async () => {
    token = await loginUser(api, "gallery2Admin");
  });

  test("Get users", async () => {
    await getUsers(token, 403);
  });
  test("Get admin", async () => {
    await getUser(token, "admin", 403);
  });
  test("Get plainUser", async () => {
    await getUser(token, "plainUser", 403);
  });
  test("Get invalid", async () => {
    await getUser(token, "invalid", 403);
  });
});

describe("As plainUser", () => {
  let token = undefined;
  beforeAll(async () => {
    token = await loginUser(api, "plainUser");
  });

  test("Get users", async () => {
    await getUsers(token, 403);
  });
  test("Get admin", async () => {
    await getUser(token, "admin", 403);
  });
  test("Get plainUser", async () => {
    await getUser(token, "plainUser", 403);
  });
  test("Get invalid", async () => {
    await getUser(token, "invalid", 403);
  });
});

describe("As gallery1User", () => {
  let token = undefined;
  beforeAll(async () => {
    token = await loginUser(api, "gallery1User");
  });

  test("Get users", async () => {
    await getUsers(token, 403);
  });
  test("Get admin", async () => {
    await getUser(token, "admin", 403);
  });
  test("Get plainUser", async () => {
    await getUser(token, "plainUser", 403);
  });
  test("Get invalid", async () => {
    await getUser(token, "invalid", 403);
  });
});

describe("As gallery12User", () => {
  let token = undefined;
  beforeAll(async () => {
    token = await loginUser(api, "gallery12User");
  });

  test("Get users", async () => {
    await getUsers(token, 403);
  });
  test("Get admin", async () => {
    await getUser(token, "admin", 403);
  });
  test("Get plainUser", async () => {
    await getUser(token, "plainUser", 403);
  });
  test("Get invalid", async () => {
    await getUser(token, "invalid", 403);
  });
});

afterAll(() => {});
