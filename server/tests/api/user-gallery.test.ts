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


describe("As guest", () => {
  test("List rejected", () => api.get("/api/v1/user-gallery").expect(403));
  test("Upsert rejected", () =>
    api
      .put("/api/v1/user-gallery/plainuser/gallery1")
      .send({ isEditor: false })
      .expect(403));
  test("Delete rejected", () =>
    api.delete("/api/v1/user-gallery/plainuser/gallery1").expect(403));
});

describe("As gallery1admin (non-global)", () => {
  let token: string;
  beforeEach(async () => {
    token = await loginUser(api, "gallery1admin");
  });
  test("List rejected (global admin only)", () =>
    api
      .get("/api/v1/user-gallery")
      .set("Authorization", `Bearer ${token}`)
      .expect(403));
  test("Upsert rejected", () =>
    api
      .put("/api/v1/user-gallery/plainuser/gallery1")
      .set("Authorization", `Bearer ${token}`)
      .send({ isEditor: false })
      .expect(403));
  test("Delete rejected", () =>
    api
      .delete("/api/v1/user-gallery/plainuser/gallery1")
      .set("Authorization", `Bearer ${token}`)
      .expect(403));
});

describe("As admin", () => {
  let token: string;
  beforeEach(async () => {
    token = await loginUser(api, "admin");
  });
  test("List all", async () => {
    const result = await api
      .get("/api/v1/user-gallery")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(Array.isArray(result.body)).toBe(true);
    expect(result.body.length).toBeGreaterThan(0);
  });
  test("Filter by userId", async () => {
    const result = await api
      .get("/api/v1/user-gallery")
      .query({ userId: "gallery1admin" })
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(
      result.body.every(
        (row: { user_id: string }) => row.user_id === "gallery1admin"
      )
    ).toBe(true);
  });
  test("Filter by galleryId", async () => {
    const result = await api
      .get("/api/v1/user-gallery")
      .query({ galleryId: "gallery2" })
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(
      result.body.every(
        (row: { gallery_id: string }) => row.gallery_id === "gallery2"
      )
    ).toBe(true);
  });
  test("Upsert grants view (is_editor=false)", async () => {
    await api
      .put("/api/v1/user-gallery/plainuser/gallery1")
      .set("Authorization", `Bearer ${token}`)
      .send({ isEditor: false })
      .expect(204);
    const result = await api
      .get("/api/v1/user-gallery")
      .query({ userId: "plainuser", galleryId: "gallery1" })
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(result.body.length).toBe(1);
    expect(result.body[0].is_editor).toBe(0);
  });
  test("Upsert promotes to gallery admin (is_editor=true)", async () => {
    await api
      .put("/api/v1/user-gallery/gallery1admin/gallery1")
      .set("Authorization", `Bearer ${token}`)
      .send({ isEditor: true })
      .expect(204);
    const result = await api
      .get("/api/v1/user-gallery")
      .query({ userId: "gallery1admin", galleryId: "gallery1" })
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(result.body[0].is_editor).toBe(1);
  });
  test("Delete (revokes the row entirely)", async () => {
    await api
      .delete("/api/v1/user-gallery/gallery1admin/gallery1")
      .set("Authorization", `Bearer ${token}`)
      .expect(204);
    const result = await api
      .get("/api/v1/user-gallery")
      .query({ userId: "gallery1admin", galleryId: "gallery1" })
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(result.body.length).toBe(0);
  });
  test("Upsert with hideMap=null persists NULL (inherit)", async () => {
    // Seed with hideMap=true (hide) so we can verify the move back to null.
    await api
      .put("/api/v1/user-gallery/plainuser/gallery1")
      .set("Authorization", `Bearer ${token}`)
      .send({ isEditor: false, hideMap: true })
      .expect(204);
    let result = await api
      .get("/api/v1/user-gallery")
      .query({ userId: "plainuser", galleryId: "gallery1" })
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(result.body[0].hide_map).toBe(1);
    // Move back to inherit by sending hideMap=null.
    await api
      .put("/api/v1/user-gallery/plainuser/gallery1")
      .set("Authorization", `Bearer ${token}`)
      .send({ isEditor: false, hideMap: null })
      .expect(204);
    result = await api
      .get("/api/v1/user-gallery")
      .query({ userId: "plainuser", galleryId: "gallery1" })
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(result.body[0].hide_map).toBeNull();
  });
  test("Upsert with hideMap omitted persists NULL (default on insert)", async () => {
    await api
      .put("/api/v1/user-gallery/plainuser/gallery1")
      .set("Authorization", `Bearer ${token}`)
      .send({ isEditor: false })
      .expect(204);
    const result = await api
      .get("/api/v1/user-gallery")
      .query({ userId: "plainuser", galleryId: "gallery1" })
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(result.body[0].hide_map).toBeNull();
  });
  test("Upsert with invalid isEditor → 400", () =>
    api
      .put("/api/v1/user-gallery/plainuser/gallery1")
      .set("Authorization", `Bearer ${token}`)
      .send({ isEditor: "yes" })
      .expect(400));
  test("Upsert with extra field → 400", () =>
    api
      .put("/api/v1/user-gallery/plainuser/gallery1")
      .set("Authorization", `Bearer ${token}`)
      .send({ isEditor: false, bogus: true })
      .expect(400));
});

