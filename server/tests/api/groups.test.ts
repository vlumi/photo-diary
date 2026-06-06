import { init } from "../../app.js";
import dummyFactory from "../../db/dummy.js";
import { createApi, loginUser } from "./helper.js";

const db = dummyFactory();
const { api } = createApi();

beforeEach(async () => {
  await db.init();
  await init();
});

const adminToken = async () => `Bearer ${await loginUser(api, "admin")}`;

describe("As guest", () => {
  test("list rejected", () => api.get("/api/v1/groups").expect(403));
  test("create rejected", () =>
    api.post("/api/v1/groups").send({ id: "family" }).expect(403));
});

describe("As non-admin", () => {
  test("list rejected", async () => {
    const token = await loginUser(api, "gallery1admin");
    await api
      .get("/api/v1/groups")
      .set("Authorization", `Bearer ${token}`)
      .expect(403);
  });
});

describe("As admin", () => {
  test("Create then list", async () => {
    const auth = await adminToken();
    await api
      .post("/api/v1/groups")
      .set("Authorization", auth)
      .send({ id: "family", name: "Family" })
      .expect(201);
    const list = await api
      .get("/api/v1/groups")
      .set("Authorization", auth)
      .expect(200);
    expect(list.body).toEqual([
      { id: "family", name: "Family", description: "" },
    ]);
  });

  test("Reject ids with the `:` sigil prefix", async () => {
    const auth = await adminToken();
    await api
      .post("/api/v1/groups")
      .set("Authorization", auth)
      .send({ id: ":bogus" })
      .expect(400);
  });

  test("Update and delete", async () => {
    const auth = await adminToken();
    await api
      .post("/api/v1/groups")
      .set("Authorization", auth)
      .send({ id: "family" })
      .expect(201);
    await api
      .put("/api/v1/groups/family")
      .set("Authorization", auth)
      .send({ name: "Renamed", description: "Inner circle" })
      .expect(204);
    const got = await api
      .get("/api/v1/groups/family")
      .set("Authorization", auth)
      .expect(200);
    expect(got.body).toEqual({
      id: "family",
      name: "Renamed",
      description: "Inner circle",
    });
    await api
      .delete("/api/v1/groups/family")
      .set("Authorization", auth)
      .expect(204);
    await api
      .get("/api/v1/groups/family")
      .set("Authorization", auth)
      .expect(404);
  });

  test("Member add / list / remove (idempotent add)", async () => {
    const auth = await adminToken();
    await api
      .post("/api/v1/groups")
      .set("Authorization", auth)
      .send({ id: "family" })
      .expect(201);
    await api
      .put("/api/v1/groups/family/members/gallery1user")
      .set("Authorization", auth)
      .expect(204);
    // Re-running is a no-op (idempotent), still 204.
    await api
      .put("/api/v1/groups/family/members/gallery1user")
      .set("Authorization", auth)
      .expect(204);
    const members = await api
      .get("/api/v1/groups/family/members")
      .set("Authorization", auth)
      .expect(200);
    expect(members.body).toEqual(["gallery1user"]);
    await api
      .delete("/api/v1/groups/family/members/gallery1user")
      .set("Authorization", auth)
      .expect(204);
    const afterRemove = await api
      .get("/api/v1/groups/family/members")
      .set("Authorization", auth)
      .expect(200);
    expect(afterRemove.body).toEqual([]);
  });
});
