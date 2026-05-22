import { init } from "../../app.js";
import { _resetLoginRateLimitForTests } from "../../controllers/tokens-v1.js";
import { createApi, loginUser } from "./helper.js";

const { api, close } = createApi();

beforeEach(async () => {
  await init();
  // The login throttle holds in-memory per-IP failure counts that persist
  // across tests (supertest always connects from 127.0.0.1, so every test
  // shares one IP key). Reset between tests so each scenario starts fresh.
  _resetLoginRateLimitForTests();
});

afterAll(close);

describe("Login", () => {
  test("Non-existing user", async () => {
    await api
      .post("/api/v1/tokens")
      .send({
        id: "wrong",
        password: "wrong",
      })
      .expect(401);
  });
  test("Wrong password", async () => {
    await api
      .post("/api/v1/tokens")
      .send({
        id: "admin",
        password: "wrong",
      })
      .expect(401);
  });
  test("Successful login", async () => {
    const result = await api
      .post("/api/v1/tokens")
      .send({
        id: "admin",
        password: "foobar",
      })
      .expect(200);
    expect(result.body.token).toBeDefined();
  });
});
describe("Login rate limit", () => {
  test("10 failed logins → 11th returns 429", async () => {
    for (let i = 0; i < 10; i++) {
      await api
        .post("/api/v1/tokens")
        .send({ id: "admin", password: "wrong" })
        .expect(401);
    }
    const result = await api
      .post("/api/v1/tokens")
      .send({ id: "admin", password: "wrong" })
      .expect(429);
    expect(result.body.error).toMatch(/too many failed login attempts/i);
  });

  test("Successful logins do not tick the counter", async () => {
    // 5 failures + a successful login + 5 more failures = 10 failures total.
    // The 11th request should still pass through to the credential check (=
    // not 429) — proving the success didn't add to the failure count.
    for (let i = 0; i < 5; i++) {
      await api
        .post("/api/v1/tokens")
        .send({ id: "admin", password: "wrong" })
        .expect(401);
    }
    await api
      .post("/api/v1/tokens")
      .send({ id: "admin", password: "foobar" })
      .expect(200);
    for (let i = 0; i < 5; i++) {
      await api
        .post("/api/v1/tokens")
        .send({ id: "admin", password: "wrong" })
        .expect(401);
    }
    // 10 failures cumulative, so the next failure should trip the limit.
    await api
      .post("/api/v1/tokens")
      .send({ id: "admin", password: "wrong" })
      .expect(429);
  });

  test("Successful logins alone never trip the limit", async () => {
    for (let i = 0; i < 15; i++) {
      await api
        .post("/api/v1/tokens")
        .send({ id: "admin", password: "foobar" })
        .expect(200);
    }
  });
});

describe("Keep-alive", () => {
  let token: string | undefined = undefined;
  beforeEach(async () => {
    token = await loginUser(api, "admin");
  });

  test("Success", async () => {
    await api
      .get("/api/v1/tokens")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
  });
});

// describe("Logout", () => {
//   let token: string | undefined = undefined;
//   beforeEach(async () => {
//     token = await loginUser(api, "admin");
//   });

//   test("Success", async () => {
//     await api
//       .get("/api/v1/tokens")
//       .set("Authorization", `Bearer ${token}`)
//       .expect(200);
//     await api
//       .delete("/api/v1/tokens")
//       .set("Authorization", `Bearer ${token}`)
//       .expect(204);
//     await api
//       .get("/api/v1/tokens")
//       .set("Authorization", `Bearer ${token}`)
//       .expect(401);
//   });
// });
// describe("Revoke", () => {
//   let tokens = [];
//   beforeEach(async () => {
//     tokens = [
//       await loginUser(api, "plainUser"),
//       await loginUser(api, "plainUser"),
//       await loginUser(api, "plainUser"),
//     ];
//   });

//   test("Self", async () => {
//     Promise.all(
//       tokens.map(async (token) => {
//         api
//           .get("/api/v1/tokens")
//           .set("Authorization", `Bearer ${token}`)
//           .expect(200);
//       })
//     );
//     await api
//       .delete("/api/v1/tokens")
//       .set("Authorization", `Bearer ${tokens[0]}`)
//       .expect(204);
//     Promise.all(
//       tokens.map((token) => {
//         api
//           .get("/api/v1/tokens")
//           .set("Authorization", `Bearer ${token}`)
//           .expect(401);
//       })
//     );
//   });
//   test("By admin", async () => {
//     const adminToken = await loginUser(api, "admin");
//     Promise.all(
//       tokens.map(async (token) => {
//         api
//           .get("/api/v1/tokens")
//           .set("Authorization", `Bearer ${token}`)
//           .expect(200);
//       })
//     );
//     await api
//       .delete("/api/v1/tokens/plainUser")
//       .set("Authorization", `Bearer ${adminToken}`)
//       .expect(204);
//     Promise.all(
//       tokens.map((token) => {
//         api
//           .get("/api/v1/tokens")
//           .set("Authorization", `Bearer ${token}`)
//           .expect(401);
//       })
//     );
//   });
//   test("By non-admin", async () => {
//     const otherToken = await loginUser(api, "simpleUser");
//     Promise.all(
//       tokens.map(async (token) => {
//         api
//           .get("/api/v1/tokens")
//           .set("Authorization", `Bearer ${token}`)
//           .expect(200);
//       })
//     );
//     await api
//       .delete("/api/v1/tokens/plainUser")
//       .set("Authorization", `Bearer ${otherToken}`)
//       .expect(403);
//     Promise.all(
//       tokens.map((token) => {
//         api
//           .get("/api/v1/tokens")
//           .set("Authorization", `Bearer ${token}`)
//           .expect(401);
//       })
//     );
//   });
// });
