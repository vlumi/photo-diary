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

const auth = (token: string | undefined): Record<string, string> =>
  token ? { Authorization: `Bearer ${token}` } : {};

const flipPrivate = async (
  token: string,
  photoId: string,
  isPrivate: boolean,
  status = 204
) =>
  api
    .put(`/api/v1/photos/${photoId}`)
    .set(auth(token))
    .send({ isPrivate })
    .expect(status);

describe("per-photo visibility (#480)", () => {
  describe("read path: viewer without can_see_private", () => {
    test("private photo drops out of every gallery it's in", async () => {
      const adminToken = await loginUser(api, "admin");
      // gallery12photo is linked to both gallery1 and gallery2 —
      // flagging it private hides it from both for view-only viewers.
      await flipPrivate(adminToken, "gallery12photo.jpg", true);

      const viewerToken = await loginUser(api, "gallery12user");
      const inGal1 = await api
        .get("/api/v1/gallery-photos/gallery1")
        .set(auth(viewerToken))
        .expect(200);
      expect(inGal1.body.map((p: { id: string }) => p.id)).not.toContain(
        "gallery12photo.jpg"
      );
      const inGal2 = await api
        .get("/api/v1/gallery-photos/gallery2")
        .set(auth(viewerToken))
        .expect(200);
      expect(inGal2.body.map((p: { id: string }) => p.id)).not.toContain(
        "gallery12photo.jpg"
      );
    });

    test("private photo is 404 via gallery-context per-id and by-original-filename", async () => {
      const adminToken = await loginUser(api, "admin");
      await flipPrivate(adminToken, "gallery1photo.jpg", true);

      const viewerToken = await loginUser(api, "gallery1user");
      await api
        .get("/api/v1/gallery-photos/gallery1/gallery1photo.jpg")
        .set(auth(viewerToken))
        .expect(404);
      await api
        .get(
          "/api/v1/gallery-photos/gallery1/by-original-filename/gallery1photo.jpg"
        )
        .set(auth(viewerToken))
        .expect(404);
    });

    test("private photos drop from stats counts under viewer scope", async () => {
      const adminToken = await loginUser(api, "admin");
      await flipPrivate(adminToken, "gallery1photo.jpg", true);

      const viewerToken = await loginUser(api, "gallery1user");
      const res = await api
        .post("/api/v1/galleries/gallery1/stats")
        .set(auth(viewerToken))
        .send({})
        .expect(200);
      // gallery1 has two photos in the fixture; one is now private.
      expect(res.body.total).toBe(1);
    });
  });

  describe("read path: editor sees private", () => {
    test("editor on the gallery sees private photos (implicit private-view)", async () => {
      const adminToken = await loginUser(api, "admin");
      await flipPrivate(adminToken, "gallery1photo.jpg", true);

      const editorToken = await loginUser(api, "gallery1admin");
      const list = await api
        .get("/api/v1/gallery-photos/gallery1")
        .set(auth(editorToken))
        .expect(200);
      expect(list.body.map((p: { id: string }) => p.id)).toContain(
        "gallery1photo.jpg"
      );
    });
  });

  describe("read path: per-gallery can_see_private exposes only in that gallery", () => {
    test("user with can_see_private on gallery1 sees the photo there, hidden in gallery2", async () => {
      const adminToken = await loginUser(api, "admin");
      await flipPrivate(adminToken, "gallery12photo.jpg", true);
      // gallery12user starts with plain view on both galleries.
      // Promote view on gallery1 to also see private; gallery2 stays view-only.
      await api
        .put("/api/v1/user-gallery/gallery12user/gallery1")
        .set(auth(adminToken))
        .send({ isEditor: false, canSeePrivate: true })
        .expect(204);

      const viewerToken = await loginUser(api, "gallery12user");
      const inGal1 = await api
        .get("/api/v1/gallery-photos/gallery1")
        .set(auth(viewerToken))
        .expect(200);
      expect(inGal1.body.map((p: { id: string }) => p.id)).toContain(
        "gallery12photo.jpg"
      );
      const inGal2 = await api
        .get("/api/v1/gallery-photos/gallery2")
        .set(auth(viewerToken))
        .expect(200);
      expect(inGal2.body.map((p: { id: string }) => p.id)).not.toContain(
        "gallery12photo.jpg"
      );
    });
  });

  describe("write path", () => {
    test("PUT requires gallery-editor on at least one of the photo's galleries (viewer → 403)", async () => {
      const viewerToken = await loginUser(api, "gallery1user");
      await flipPrivate(viewerToken, "gallery1photo.jpg", true, 403);
    });

    test("editor on any of the photo's galleries can flip the flag", async () => {
      const editorToken = await loginUser(api, "gallery1admin");
      await flipPrivate(editorToken, "gallery12photo.jpg", true);
      const adminToken = await loginUser(api, "admin");
      const photo = await api
        .get("/api/v1/photos/gallery12photo.jpg")
        .set(auth(adminToken))
        .expect(200);
      expect(photo.body.isPrivate).toBe(true);
    });
  });

  describe("photo-modal badge", () => {
    test("gallery-context fetch carries isPrivate on the photo body", async () => {
      const adminToken = await loginUser(api, "admin");
      await flipPrivate(adminToken, "gallery1photo.jpg", true);

      const editorToken = await loginUser(api, "gallery1admin");
      const res = await api
        .get("/api/v1/gallery-photos/gallery1/gallery1photo.jpg")
        .set(auth(editorToken))
        .expect(200);
      expect(res.body.isPrivate).toBe(true);
    });

    test("isPrivate=false when the photo isn't flagged", async () => {
      const adminToken = await loginUser(api, "admin");
      const res = await api
        .get("/api/v1/gallery-photos/gallery1/gallery1photo.jpg")
        .set(auth(adminToken))
        .expect(200);
      expect(res.body.isPrivate).toBe(false);
    });
  });
});
