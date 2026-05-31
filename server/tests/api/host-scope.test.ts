import { afterAll, beforeEach, describe, expect, test } from "vitest";
import type { Agent } from "supertest";

import { init } from "../../app.js";
import dummyFactory from "../../db/dummy.js";
import dbFacade from "../../db/index.js";
import { createApi, loginUser } from "./helper.js";

const db = dummyFactory();
const { api, close } = createApi();

beforeEach(async () => {
  await db.init();
  // Pin two galleries to test hostnames. gallery3 stays unpinned so
  // we can exercise "off-scope gallery from a scoped host."
  await dbFacade.updateGallery("gallery1", {
    hostname: "^gallery1\\.example\\.com$",
  });
  await dbFacade.updateGallery("gallery2", {
    hostname: "^gallery2\\.example\\.com$",
  });
  await init();
});

afterAll(close);

// Supertest re-uses the underlying http.Server's port; the Host header is
// what Fastify's `request.hostname` reads, so this is the lever for scope
// resolution. Tests without `withHost` go through `localhost`, which
// matches no gallery and stays unscoped.
const withHost = (req: ReturnType<Agent["get"]>, host: string) =>
  req.set("Host", host);

const adminAuth = async () => {
  const token = await loginUser(api, "admin");
  return `Bearer ${token}`;
};

describe("unscoped host (no gallery.hostname match)", () => {
  test("POST /users succeeds", async () => {
    const auth = await adminAuth();
    await api
      .post("/api/v1/users")
      .set("Authorization", auth)
      .send({ id: "freshuser", password: "p" })
      .expect(201);
  });

  test("POST /galleries succeeds", async () => {
    const auth = await adminAuth();
    await api
      .post("/api/v1/galleries")
      .set("Authorization", auth)
      .send({ id: "freshgal", title: "Fresh" })
      .expect(201);
  });

  test("POST /meta succeeds", async () => {
    const auth = await adminAuth();
    await api
      .delete("/api/v1/meta/cdn")
      .set("Authorization", auth)
      .expect(204);
    await api
      .post("/api/v1/meta")
      .set("Authorization", auth)
      .send({ key: "cdn", value: "https://x" })
      .expect(201);
  });
});

describe("scoped host (single match: gallery1.example.com → gallery1)", () => {
  test("POST /users → 404", async () => {
    const auth = await adminAuth();
    await withHost(api.post("/api/v1/users"), "gallery1.example.com")
      .set("Authorization", auth)
      .send({ id: "freshuser", password: "p" })
      .expect(404);
  });

  test("PUT /users/:id → 404", async () => {
    const auth = await adminAuth();
    await withHost(api.put("/api/v1/users/admin"), "gallery1.example.com")
      .set("Authorization", auth)
      .send({ password: "newpass" })
      .expect(404);
  });

  test("DELETE /users/:id → 404", async () => {
    const auth = await adminAuth();
    await withHost(api.delete("/api/v1/users/admin"), "gallery1.example.com")
      .set("Authorization", auth)
      .expect(404);
  });

  test("GET /users → 404", async () => {
    const auth = await adminAuth();
    await withHost(api.get("/api/v1/users"), "gallery1.example.com")
      .set("Authorization", auth)
      .expect(404);
  });

  test("POST /galleries → 404", async () => {
    const auth = await adminAuth();
    await withHost(api.post("/api/v1/galleries"), "gallery1.example.com")
      .set("Authorization", auth)
      .send({ id: "freshgal", title: "x" })
      .expect(404);
  });

  test("PUT /galleries/:id (in scope) → 204", async () => {
    const auth = await adminAuth();
    await withHost(
      api.put("/api/v1/galleries/gallery1"),
      "gallery1.example.com"
    )
      .set("Authorization", auth)
      .send({ title: "renamed" })
      .expect(204);
  });

  test("PUT /galleries/:id (off scope) → 404", async () => {
    const auth = await adminAuth();
    await withHost(
      api.put("/api/v1/galleries/gallery2"),
      "gallery1.example.com"
    )
      .set("Authorization", auth)
      .send({ title: "renamed" })
      .expect(404);
  });

  test("DELETE /galleries/:id → 404 (DELETE never allowed on scoped host)", async () => {
    const auth = await adminAuth();
    await withHost(
      api.delete("/api/v1/galleries/gallery1"),
      "gallery1.example.com"
    )
      .set("Authorization", auth)
      .expect(404);
  });

  test("POST /meta → 404", async () => {
    const auth = await adminAuth();
    await withHost(api.post("/api/v1/meta"), "gallery1.example.com")
      .set("Authorization", auth)
      .send({ key: "cdn", value: "x" })
      .expect(404);
  });

  test("PUT /meta/:key → 404", async () => {
    const auth = await adminAuth();
    await withHost(api.put("/api/v1/meta/name"), "gallery1.example.com")
      .set("Authorization", auth)
      .send({ value: "x" })
      .expect(404);
  });

  test("DELETE /meta/:key → 404", async () => {
    const auth = await adminAuth();
    await withHost(api.delete("/api/v1/meta/name"), "gallery1.example.com")
      .set("Authorization", auth)
      .expect(404);
  });

  test("POST /photos → 404", async () => {
    const auth = await adminAuth();
    await withHost(api.post("/api/v1/photos"), "gallery1.example.com")
      .set("Authorization", auth)
      .send({ id: "newp.jpg" })
      .expect(404);
  });

  test("PUT /photos/:id (in scope) → 204", async () => {
    const auth = await adminAuth();
    await withHost(
      api.put("/api/v1/photos/gallery1photo.jpg"),
      "gallery1.example.com"
    )
      .set("Authorization", auth)
      .send({ title: "renamed" })
      .expect(204);
  });

  test("PUT /photos/:id (off scope) → 404", async () => {
    const auth = await adminAuth();
    // gallery2photo.jpg is in gallery2 only; gallery1.example.com is
    // scoped to gallery1, so the photo is unreachable for mutation.
    await withHost(
      api.put("/api/v1/photos/gallery2photo.jpg"),
      "gallery1.example.com"
    )
      .set("Authorization", auth)
      .send({ title: "renamed" })
      .expect(404);
  });

  test("DELETE /photos/:id (off scope) → 404", async () => {
    const auth = await adminAuth();
    await withHost(
      api.delete("/api/v1/photos/gallery2photo.jpg"),
      "gallery1.example.com"
    )
      .set("Authorization", auth)
      .expect(404);
  });

  test("PUT /user-gallery/:user/:gallery (in scope) → 204", async () => {
    const auth = await adminAuth();
    await withHost(
      api.put("/api/v1/user-gallery/plainUser/gallery1"),
      "gallery1.example.com"
    )
      .set("Authorization", auth)
      .send({ accessLevel: "view" })
      .expect(204);
  });

  test("PUT /user-gallery/:user/:gallery (off scope) → 404", async () => {
    const auth = await adminAuth();
    await withHost(
      api.put("/api/v1/user-gallery/plainUser/gallery2"),
      "gallery1.example.com"
    )
      .set("Authorization", auth)
      .send({ accessLevel: "view" })
      .expect(404);
  });

  test("DELETE /user-gallery/:user/:gallery (off scope) → 404", async () => {
    const auth = await adminAuth();
    await withHost(
      api.delete("/api/v1/user-gallery/plainUser/gallery2"),
      "gallery1.example.com"
    )
      .set("Authorization", auth)
      .expect(404);
  });

  test("GET /user-gallery filters to scoped gallery only", async () => {
    const auth = await adminAuth();
    const result = await withHost(
      api.get("/api/v1/user-gallery"),
      "gallery1.example.com"
    )
      .set("Authorization", auth)
      .expect(200);
    expect(
      (result.body as Array<{ gallery_id: string }>).every(
        (row) => row.gallery_id === "gallery1"
      )
    ).toBe(true);
  });

  test("Public read GET /galleries/:id (off scope) is unaffected", async () => {
    // Hostname binds the admin boundary, not the read boundary. With
    // gallery3 publicly viewable, a request from a scoped host still
    // gets the same payload it would from anywhere else.
    const result = await withHost(
      api.get("/api/v1/galleries/gallery3"),
      "gallery1.example.com"
    ).expect(200);
    expect((result.body as { id: string }).id).toBe("gallery3");
  });
});

describe("scoped host (multi match)", () => {
  test("regex matching multiple galleries scopes to that set", async () => {
    // Override both galleries to share a parent pattern.
    await dbFacade.updateGallery("gallery1", {
      hostname: "\\.example\\.com$",
    });
    await dbFacade.updateGallery("gallery2", {
      hostname: "\\.example\\.com$",
    });
    const auth = await adminAuth();
    // Both are in scope: PUT either is fine.
    await withHost(
      api.put("/api/v1/galleries/gallery1"),
      "anything.example.com"
    )
      .set("Authorization", auth)
      .send({ title: "x" })
      .expect(204);
    await withHost(
      api.put("/api/v1/galleries/gallery2"),
      "anything.example.com"
    )
      .set("Authorization", auth)
      .send({ title: "x" })
      .expect(204);
    // gallery3 has no hostname pattern → not in scope.
    await withHost(
      api.put("/api/v1/galleries/gallery3"),
      "anything.example.com"
    )
      .set("Authorization", auth)
      .send({ title: "x" })
      .expect(404);
    // Cross-cutting endpoints still 404 — multi-match is still scope.
    await withHost(api.post("/api/v1/users"), "anything.example.com")
      .set("Authorization", auth)
      .send({ id: "freshuser", password: "p" })
      .expect(404);
  });
});
