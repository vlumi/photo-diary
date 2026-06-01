import { init } from "../../app.js";
import dummyFactory from "../../db/dummy.js";
import { createApi, loginUser } from "./helper.js";

const db = dummyFactory();

const { api } = createApi();

beforeEach(async () => {
  await db.init();
  await init();
});


const getUsers = async (token: string | undefined, status = 200) =>
  api.get("/api/v1/users").set("Authorization", `Bearer ${token}`).expect(status);

const getUser = async (token: string | undefined, id: string, status = 200) =>
  api
    .get(`/api/v1/users/${id}`)
    .set("Authorization", `Bearer ${token}`)
    .expect(status);

describe("As Guest", () => {
  test("Get users", async () => {
    await api.get("/api/v1/users").expect(403);
  });
  test("Get admin", async () => {
    await api.get("/api/v1/users/admin").expect(403);
  });
});

describe("As admin", () => {
  let token: string | undefined = undefined;
  beforeAll(async () => {
    token = await loginUser(api, "admin");
  });

  test("Get users", async () => {
    const response = await getUsers(token);
    const users = response.body;
    expect(users).toBeDefined();
    expect(users.length).toBe(9);
    const admin = users.find((user: { id: string }) => user.id === "admin");
    expect(admin).toBeDefined();
    expect(admin.id).toBe("admin");
    expect(admin.password).not.toBeDefined();
    users.forEach((user: { id: string; isAdmin?: boolean; password?: string }) => {
      expect(user).toBeDefined();
      // Two visible fields now: id + isAdmin. Password not exposed.
      expect(Object.keys(user).length).toBe(2);
      expect(user.id).toBeDefined();
      expect(typeof user.isAdmin).toBe("boolean");
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
  let token: string | undefined = undefined;
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
  let token: string | undefined = undefined;
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
  let token: string | undefined = undefined;
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
  let token: string | undefined = undefined;
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
  let token: string | undefined = undefined;
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

const changePassword = async (
  token: string | undefined,
  body: Record<string, string>,
  status = 200
) =>
  api
    .put("/api/v1/users/self/password")
    .set("Authorization", `Bearer ${token}`)
    .send(body)
    .expect(status);

describe("PUT /users/self/password", () => {
  test("Guest cannot change password", async () => {
    await api
      .put("/api/v1/users/self/password")
      .send({ currentPassword: "foobar", newPassword: "new-secret-123" })
      .expect(403);
  });

  test("Wrong current password is rejected with 422 (body problem, not session)", async () => {
    const token = await loginUser(api, "admin");
    await changePassword(
      token,
      { currentPassword: "wrong", newPassword: "new-secret-123" },
      422
    );
  });

  test("Empty current password is rejected by the schema (400)", async () => {
    const token = await loginUser(api, "admin");
    await changePassword(
      token,
      { currentPassword: "", newPassword: "new-secret-123" },
      400
    );
  });

  test("Empty new password is rejected by the schema (400)", async () => {
    const token = await loginUser(api, "admin");
    await changePassword(
      token,
      { currentPassword: "foobar", newPassword: "" },
      400
    );
  });

  test("Successful change returns a fresh token pair that verifies", async () => {
    const token = await loginUser(api, "admin");
    const result = await changePassword(token, {
      currentPassword: "foobar",
      newPassword: "fresh-secret-123",
    });
    expect(result.body.accessToken).toBeDefined();
    expect(typeof result.body.accessToken).toBe("string");
    expect(result.body.refreshToken).toBeDefined();
    expect(typeof result.body.refreshToken).toBe("string");
    // The new access token should verify on the next request — the secret
    // cache was rotated in-process so the freshly-minted JWT signs against
    // the right secret.
    await api
      .get("/api/v1/tokens")
      .set("Authorization", `Bearer ${result.body.accessToken}`)
      .expect(200);
  });

  test("The new password works for subsequent logins", async () => {
    const token = await loginUser(api, "admin");
    await changePassword(token, {
      currentPassword: "foobar",
      newPassword: "newer-secret-456",
    });
    await api
      .post("/api/v1/tokens")
      .send({ id: "admin", password: "newer-secret-456" })
      .expect(200);
  });

  test("The old password no longer works after the change", async () => {
    const token = await loginUser(api, "admin");
    await changePassword(token, {
      currentPassword: "foobar",
      newPassword: "yet-another-secret-789",
    });
    await api
      .post("/api/v1/tokens")
      .send({ id: "admin", password: "foobar" })
      .expect(401);
  });
});

describe("Mutations as guest", () => {
  test("Create rejected", () =>
    api
      .post("/api/v1/users")
      .send({ id: "newuser", password: "secret" })
      .expect(403));
  test("Update rejected", () =>
    api
      .put("/api/v1/users/admin")
      .send({ password: "reset" })
      .expect(403));
  test("Delete rejected", () => api.delete("/api/v1/users/admin").expect(403));
});

describe("Mutations as gallery1Admin", () => {
  let token: string;
  beforeEach(async () => {
    token = await loginUser(api, "gallery1Admin");
  });
  test("Create rejected", () =>
    api
      .post("/api/v1/users")
      .set("Authorization", `Bearer ${token}`)
      .send({ id: "newuser", password: "secret" })
      .expect(403));
  test("Update rejected", () =>
    api
      .put("/api/v1/users/admin")
      .set("Authorization", `Bearer ${token}`)
      .send({ password: "reset" })
      .expect(403));
  test("Delete rejected", () =>
    api
      .delete("/api/v1/users/admin")
      .set("Authorization", `Bearer ${token}`)
      .expect(403));
});

describe("Mutations as admin", () => {
  let token: string;
  beforeEach(async () => {
    token = await loginUser(api, "admin");
  });

  test("Create user", async () => {
    await api
      .post("/api/v1/users")
      .set("Authorization", `Bearer ${token}`)
      .send({ id: "freshuser", password: "freshpass" })
      .expect(201);
    // Login as the new user proves the password hash + secret were stored.
    await api
      .post("/api/v1/tokens")
      .send({ id: "freshuser", password: "freshpass" })
      .expect(200);
  });
  test("Update user password (admin reset)", async () => {
    await api
      .put("/api/v1/users/plainUser")
      .set("Authorization", `Bearer ${token}`)
      .send({ password: "reset-pass" })
      .expect(204);
    await api
      .post("/api/v1/tokens")
      .send({ id: "plainUser", password: "reset-pass" })
      .expect(200);
    await api
      .post("/api/v1/tokens")
      .send({ id: "plainUser", password: "foobar" })
      .expect(401);
  });
  test("Delete user", async () => {
    await api
      .delete("/api/v1/users/plainUser")
      .set("Authorization", `Bearer ${token}`)
      .expect(204);
    await getUser(token, "plainUser", 404);
  });
  test("Create with invalid body → 400", () =>
    api
      .post("/api/v1/users")
      .set("Authorization", `Bearer ${token}`)
      .send({ id: "" })
      .expect(400));
  test("Update with invalid body → 400", () =>
    api
      .put("/api/v1/users/admin")
      .set("Authorization", `Bearer ${token}`)
      .send({ password: null })
      .expect(400));
});

