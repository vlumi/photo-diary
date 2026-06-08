import { vi } from "vitest";
import { TEST_CONFIG, seedApiFixture } from "./fixture.js";

vi.mock("../../lib/config/index.js", () => ({ default: TEST_CONFIG }));

import { init } from "../../app.js";
import { createApi, loginUser } from "./helper.js";

const { api } = createApi();

beforeEach(async () => {
  await seedApiFixture();
  await init();
});

const adminAuth = async () => `Bearer ${await loginUser(api, "admin")}`;

// Bootstrap: a `family` group + a gallery1user member. Tests then exercise
// access flips via grant + revoke at the group layer.
const setupGroup = async (auth: string) => {
  await api
    .post("/api/v1/groups")
    .set("Authorization", auth)
    .send({ id: "family", name: "Family" })
    .expect(201);
  await api
    .put("/api/v1/groups/family/members/gallery1admin")
    .set("Authorization", auth)
    .expect(204);
};

describe("As guest", () => {
  test("list rejected", () =>
    api.get("/api/v1/group-gallery").expect(403));
  test("upsert rejected", () =>
    api
      .put("/api/v1/group-gallery/family/gallery2")
      .send({ isEditor: false })
      .expect(403));
});

describe("As admin", () => {
  test("Upsert (grants view) → flip cascade", async () => {
    const auth = await adminAuth();
    await setupGroup(auth);
    // Before grant: gallery1admin has no rows on gallery2.
    const before = await api
      .get("/api/v1/galleries/gallery2")
      .set("Authorization", `Bearer ${await loginUser(api, "gallery1admin")}`)
      .expect(200);
    expect(before.body).toStrictEqual({ id: "gallery2", hideMap: false });

    // Grant the family group view on gallery2.
    await api
      .put("/api/v1/group-gallery/family/gallery2")
      .set("Authorization", auth)
      .send({ isEditor: false })
      .expect(204);

    // Now gallery1admin (in family) gets gallery2 via the group.
    const after = await api
      .get("/api/v1/galleries/gallery2")
      .set("Authorization", `Bearer ${await loginUser(api, "gallery1admin")}`)
      .expect(200);
    expect(after.body.id).toBe("gallery2");
    expect(after.body.title).toBe("gallery 2");
  });

  test("Upsert (admin) → group grants gallery admin level", async () => {
    const auth = await adminAuth();
    await setupGroup(auth);
    await api
      .put("/api/v1/group-gallery/family/gallery2")
      .set("Authorization", auth)
      .send({ isEditor: true })
      .expect(204);
    // gallery1admin can now PUT gallery2 via the group's admin grant.
    const galleryAdminToken = `Bearer ${await loginUser(api, "gallery1admin")}`;
    await api
      .put("/api/v1/galleries/gallery2")
      .set("Authorization", galleryAdminToken)
      .send({ title: "Renamed via group admin" })
      .expect(204);
  });

  test("Delete revokes the group grant", async () => {
    const auth = await adminAuth();
    await setupGroup(auth);
    await api
      .put("/api/v1/group-gallery/family/gallery2")
      .set("Authorization", auth)
      .send({ isEditor: false })
      .expect(204);
    await api
      .delete("/api/v1/group-gallery/family/gallery2")
      .set("Authorization", auth)
      .expect(204);
    const after = await api
      .get("/api/v1/galleries/gallery2")
      .set("Authorization", `Bearer ${await loginUser(api, "gallery1admin")}`)
      .expect(200);
    expect(after.body).toStrictEqual({ id: "gallery2", hideMap: false });
  });

  test("List filters by groupId / galleryId", async () => {
    const auth = await adminAuth();
    await setupGroup(auth);
    await api
      .put("/api/v1/group-gallery/family/gallery2")
      .set("Authorization", auth)
      .send({ isEditor: false })
      .expect(204);
    const result = await api
      .get("/api/v1/group-gallery")
      .query({ groupId: "family" })
      .set("Authorization", auth)
      .expect(200);
    expect(result.body.length).toBe(1);
    expect(result.body[0].group_id).toBe("family");
    expect(result.body[0].gallery_id).toBe("gallery2");
  });

  test("Removing the user from the group also removes their inherited access", async () => {
    const auth = await adminAuth();
    await setupGroup(auth);
    await api
      .put("/api/v1/group-gallery/family/gallery2")
      .set("Authorization", auth)
      .send({ isEditor: false })
      .expect(204);

    // With membership: gallery2 visible.
    const with_ = await api
      .get("/api/v1/galleries/gallery2")
      .set("Authorization", `Bearer ${await loginUser(api, "gallery1admin")}`)
      .expect(200);
    expect(with_.body.id).toBe("gallery2");
    expect(with_.body.title).toBe("gallery 2");

    // Remove membership: gallery2 falls back to "unavailable" placeholder.
    await api
      .delete("/api/v1/groups/family/members/gallery1admin")
      .set("Authorization", auth)
      .expect(204);
    const without = await api
      .get("/api/v1/galleries/gallery2")
      .set("Authorization", `Bearer ${await loginUser(api, "gallery1admin")}`)
      .expect(200);
    expect(without.body).toStrictEqual({ id: "gallery2", hideMap: false });
  });
});
