import { vi } from "vitest";
import { TEST_CONFIG, seedApiFixture } from "./fixture.js";

vi.mock("../../lib/config/index.js", () => ({ default: TEST_CONFIG }));

import { init } from "../../app.js";
import dbFacade from "../../db/index.js";
import { createApi, loginUser } from "./helper.js";

const { api } = createApi();

beforeEach(async () => {
  await seedApiFixture();
  await init();
});


const getGalleries = async (token: string | undefined, status = 200) =>
  api
    .get("/api/v1/galleries")
    .set("Authorization", `Bearer ${token}`)
    .expect(status);

const getGallery = async (token: string | undefined, galleryId: string, status = 200) =>
  api
    .get(`/api/v1/galleries/${galleryId}`)
    .set("Authorization", `Bearer ${token}`)
    .expect(status);

// Every "the requester can't see this gallery" case (no access AND no such
// gallery, regardless of role) collapses to the same 200 with an empty
// payload — the privacy rationale is that the difference between the two
// otherwise lets an unauthenticated attacker enumerate gallery IDs. This
// helper centralises the assertion so the tests stay readable.
const expectGalleryUnavailable = async (
  token: string | undefined,
  galleryId: string
) => {
  const req = api.get(`/api/v1/galleries/${galleryId}`);
  if (token) req.set("Authorization", `Bearer ${token}`);
  const result = await req.expect(200);
  expect(result.body).toStrictEqual({ id: galleryId, hideMap: false });
};

const expectGallery1 = (result: { body: Record<string, any> }) => {
  expect(result.body.id).toBe("gallery1");
  expect(result.body.title).toBe("gallery 1");
  expect(result.body.description).toBe("This is the first gallery");
  const photos = result.body.photos;
  expect(photos).toBeDefined();
  expect(Object.keys(photos).length).toBe(2);
  expect(photos[0].id).toBe("gallery1photo.jpg");
  expect(photos[1].id).toBe("gallery12photo.jpg");
};
const expectGallery2 = (result: { body: Record<string, any> }) => {
  expect(result.body.id).toBe("gallery2");
  expect(result.body.title).toBe("gallery 2");
  expect(result.body.description).toBe("This is the second gallery");
  const photos = result.body.photos;
  expect(photos).toBeDefined();
  expect(Object.keys(photos).length).toBe(2);
  expect(photos[0].id).toBe("gallery12photo.jpg");
  expect(photos[1].id).toBe("gallery2photo.jpg");
};
const expectGallery3 = (result: { body: Record<string, any> }) => {
  expect(result.body.id).toBe("gallery3");
  expect(result.body.title).toBe("gallery 3");
  expect(result.body.description).toBe("This is the third gallery");
  const photos = result.body.photos;
  expect(photos).toBeDefined();
  expect(Object.keys(photos).length).toBe(1);
  expect(photos[0].id).toBe("gallery3photo.jpg");
};
describe("As guest", () => {
  test("List galleries", async () => {
    const result = await api
      .get("/api/v1/galleries")
      .expect(200)
      .expect("Content-Type", /application\/json/);
    expect(result.body.length).toBe(1);
  });
  test("Get gallery1", async () => {
    await expectGalleryUnavailable(undefined, "gallery1");
  });
  test("Get gallery2", async () => {
    await expectGalleryUnavailable(undefined, "gallery2");
  });
  test("Get gallery3", async () => {
    const result = await api.get("/api/v1/galleries/gallery3").expect(200);
    expectGallery3(result);
  });
  test("Get :all", async () => {
    await expectGalleryUnavailable(undefined, ":all");
  });
  test("Get :public", async () => {
    await expectGalleryUnavailable(undefined, ":public");
  });
  test("Get invalid", async () => {
    await expectGalleryUnavailable(undefined, "invalid");
  });
});

describe("As blocked user", () => {
  let token: string | undefined = undefined;
  beforeAll(async () => {
    token = await loginUser(api, "blockeduser");
  });

  test("List galleries", async () => {
    // blockeduser has no user_gallery rows. Falls through to :guest's
    // grants under the post-#394 model — :guest sees gallery3.
    const result = await getGalleries(token);
    expect(result.body.length).toBe(1);
  });
  test("Get gallery1", async () => {
    await expectGalleryUnavailable(token, "gallery1");
  });
  test("Get gallery2", async () => {
    await expectGalleryUnavailable(token, "gallery2");
  });
  test("Get gallery3", async () => {
    // blockeduser inherits :guest's gallery3 view under the new model.
    const result = await getGallery(token, "gallery3");
    expectGallery3(result);
  });
  test("Get :all", async () => {
    await expectGalleryUnavailable(token, ":all");
  });
  test("Get :public", async () => {
    await expectGalleryUnavailable(token, ":public");
  });
  test("Get invalid", async () => {
    await expectGalleryUnavailable(token, "invalid");
  });
});

describe("As simple user", () => {
  let token: string | undefined = undefined;
  beforeAll(async () => {
    token = await loginUser(api, "simpleuser");
  });

  test("List galleries", async () => {
    const result = await getGalleries(token);
    expect(result.body.length).toBe(1);
  });
  test("Get gallery1", async () => {
    await expectGalleryUnavailable(token, "gallery1");
  });
  test("Get gallery2", async () => {
    await expectGalleryUnavailable(token, "gallery2");
  });
  test("Get gallery3", async () => {
    const result = await getGallery(token, "gallery3", 200);
    expectGallery3(result);
  });
  test("Get :all", async () => {
    await expectGalleryUnavailable(token, ":all");
  });
  test("Get :public", async () => {
    await expectGalleryUnavailable(token, ":public");
  });
  test("Get invalid", async () => {
    await expectGalleryUnavailable(token, "invalid");
  });
});

describe("As publicuser", () => {
  let token: string | undefined = undefined;
  beforeAll(async () => {
    token = await loginUser(api, "publicuser");
  });

  test("List galleries", async () => {
    // Fanned-out grants on gallery1/2/3; no pseudo-galleries.
    const result = await getGalleries(token);
    expect(result.body.length).toBe(3);
  });
  test("Get gallery1", async () => {
    const result = await getGallery(token, "gallery1");
    expectGallery1(result);
  });
  test("Get gallery2", async () => {
    const result = await getGallery(token, "gallery2");
    expectGallery2(result);
  });
  test("Get gallery3", async () => {
    const result = await getGallery(token, "gallery3");
    expectGallery3(result);
  });
  test("Get :all", async () => {
    await expectGalleryUnavailable(token, ":all");
  });
  test("Get :public", async () => {
    // :public is no longer ACL-accessible for non-admins under #394.
    await expectGalleryUnavailable(token, ":public");
  });
  test("Get invalid", async () => {
    await expectGalleryUnavailable(token, "invalid");
  });
});

describe("As admin", () => {
  let token: string | undefined = undefined;
  beforeAll(async () => {
    token = await loginUser(api, "admin");
  });

  test("List galleries", async () => {
    const result = await getGalleries(token);
    expect(result.body.length).toBe(3);
  });
  test("Get gallery1", async () => {
    const result = await getGallery(token, "gallery1");
    expectGallery1(result);
  });
  test("Get gallery2", async () => {
    const result = await getGallery(token, "gallery2");
    expectGallery2(result);
  });
  test("Get gallery3", async () => {
    const result = await getGallery(token, "gallery3");
    expectGallery3(result);
  });
  test("Get :all (no pseudo-gallery)", async () => {
    await expectGalleryUnavailable(token, ":all");
  });
  test("Get :public (no pseudo-gallery)", async () => {
    await expectGalleryUnavailable(token, ":public");
  });
  test("Get invalid", async () => {
    await expectGalleryUnavailable(token, "invalid");
  });
  test("Reorder galleries (admin) → list order follows", async () => {
    await api
      .post("/api/v1/galleries/_order")
      .set("Authorization", `Bearer ${token}`)
      .send({ ids: ["gallery3", "gallery1", "gallery2"] })
      .expect(204);
    const result = await getGalleries(token);
    const ids = (result.body as Array<{ id: string }>).map((g) => g.id);
    expect(ids).toEqual(["gallery3", "gallery1", "gallery2"]);
    await api
      .post("/api/v1/galleries/_order")
      .set("Authorization", `Bearer ${token}`)
      .send({ ids: ["gallery1", "gallery2", "gallery3"] })
      .expect(204);
  });
  test("Reorder rejects an incomplete id list (422)", async () => {
    await api
      .post("/api/v1/galleries/_order")
      .set("Authorization", `Bearer ${token}`)
      .send({ ids: ["gallery1", "gallery2"] })
      .expect(422);
  });
  test("Reorder rejects an unknown id (422)", async () => {
    await api
      .post("/api/v1/galleries/_order")
      .set("Authorization", `Bearer ${token}`)
      .send({ ids: ["gallery1", "gallery2", "gallery3", "ghost"] })
      .expect(422);
  });
  test("Reorder rejects duplicates (422)", async () => {
    await api
      .post("/api/v1/galleries/_order")
      .set("Authorization", `Bearer ${token}`)
      .send({ ids: ["gallery1", "gallery1", "gallery2"] })
      .expect(422);
  });
  test("Reorder requires admin (403 for plain user)", async () => {
    const plainToken = await loginUser(api, "plainuser");
    await api
      .post("/api/v1/galleries/_order")
      .set("Authorization", `Bearer ${plainToken}`)
      .send({ ids: ["gallery1", "gallery2", "gallery3"] })
      .expect(403);
  });
});

describe("As gallery1admin", () => {
  let token: string | undefined = undefined;
  beforeAll(async () => {
    token = await loginUser(api, "gallery1admin");
  });

  test("List galleries", async () => {
    // Own gallery1 grant + gallery3 via :guest fall-through.
    const result = await getGalleries(token);
    expect(result.body.length).toBe(2);
  });
  test("Get gallery1", async () => {
    const result = await getGallery(token, "gallery1");
    expectGallery1(result);
  });
  test("Get gallery2", async () => {
    await expectGalleryUnavailable(token, "gallery2");
  });
  test("Get gallery3", async () => {
    const result = await getGallery(token, "gallery3");
    expectGallery3(result);
  });
  test("Get :all", async () => {
    await expectGalleryUnavailable(token, ":all");
  });
  test("Get :public", async () => {
    await expectGalleryUnavailable(token, ":public");
  });
  test("Get invalid", async () => {
    await expectGalleryUnavailable(token, "invalid");
  });
});

describe("As gallery2admin", () => {
  let token: string | undefined = undefined;
  beforeAll(async () => {
    token = await loginUser(api, "gallery2admin");
  });

  test("List galleries", async () => {
    const result = await getGalleries(token);
    expect(result.body.length).toBe(2);
  });
  test("Get gallery1", async () => {
    await expectGalleryUnavailable(token, "gallery1");
  });
  test("Get gallery2", async () => {
    const result = await getGallery(token, "gallery2");
    expectGallery2(result);
  });
  test("Get gallery3", async () => {
    const result = await getGallery(token, "gallery3");
    expectGallery3(result);
  });
  test("Get :all", async () => {
    await expectGalleryUnavailable(token, ":all");
  });
  test("Get :public", async () => {
    await expectGalleryUnavailable(token, ":public");
  });
  test("Get invalid", async () => {
    await expectGalleryUnavailable(token, "invalid");
  });
});

describe("As plainuser", () => {
  let token: string | undefined = undefined;
  beforeAll(async () => {
    token = await loginUser(api, "plainuser");
  });

  test("List galleries", async () => {
    // Fanned-out grants on gallery1/2/3; no pseudo-galleries.
    const result = await getGalleries(token);
    expect(result.body.length).toBe(3);
  });
  test("Get gallery1", async () => {
    const result = await getGallery(token, "gallery1");
    expectGallery1(result);
  });
  test("Get gallery2", async () => {
    const result = await getGallery(token, "gallery2");
    expectGallery2(result);
  });
  test("Get gallery3", async () => {
    const result = await getGallery(token, "gallery3");
    expectGallery3(result);
  });
  test("Get :all", async () => {
    await expectGalleryUnavailable(token, ":all");
  });
  test("Get :public", async () => {
    await expectGalleryUnavailable(token, ":public");
  });
  test("Get invalid", async () => {
    await expectGalleryUnavailable(token, "invalid");
  });
});

describe("As gallery1user", () => {
  let token: string | undefined = undefined;
  beforeAll(async () => {
    token = await loginUser(api, "gallery1user");
  });

  test("List galleries", async () => {
    const result = await getGalleries(token);
    expect(result.body.length).toBe(2);
  });
  test("Get gallery1", async () => {
    const result = await getGallery(token, "gallery1");
    expectGallery1(result);
  });
  test("Get gallery3", async () => {
    const result = await getGallery(token, "gallery3");
    expectGallery3(result);
  });
  test("Get gallery2", async () => {
    await expectGalleryUnavailable(token, "gallery2");
  });
  test("Get :all", async () => {
    await expectGalleryUnavailable(token, ":all");
  });
  test("Get :public", async () => {
    await expectGalleryUnavailable(token, ":public");
  });
  test("Get invalid", async () => {
    await expectGalleryUnavailable(token, "invalid");
  });
});

describe("As gallery12user", () => {
  let token: string | undefined = undefined;
  beforeAll(async () => {
    token = await loginUser(api, "gallery12user");
  });

  test("List galleries", async () => {
    // gallery1, gallery2 (own grants) + gallery3 (via :guest fallthrough).
    const result = await getGalleries(token);
    expect(result.body.length).toBe(3);
  });
  test("Get gallery1", async () => {
    const result = await getGallery(token, "gallery1");
    expectGallery1(result);
  });
  test("Get gallery2", async () => {
    const result = await getGallery(token, "gallery2");
    expectGallery2(result);
  });
  test("Get gallery3", async () => {
    // Inherits gallery3 view from :guest.
    const result = await getGallery(token, "gallery3");
    expectGallery3(result);
  });
  test("Get :all", async () => {
    await expectGalleryUnavailable(token, ":all");
  });
  test("Get :public", async () => {
    await expectGalleryUnavailable(token, ":public");
  });
  test("Get invalid", async () => {
    await expectGalleryUnavailable(token, "invalid");
  });
});

describe("hide_map cascade applied to GET /galleries/:id", () => {
  let token: string | undefined = undefined;
  let spy: ReturnType<typeof vi.spyOn>;
  beforeAll(async () => {
    token = await loginUser(api, "plainuser");
  });
  beforeEach(() => {
    spy = vi.spyOn(dbFacade, "resolveHideMap").mockResolvedValue(1);
  });
  afterEach(() => {
    spy.mockRestore();
  });

  test("strips coordinates from the embedded photos array", async () => {
    const result = await getGallery(token, "gallery1");
    expect(result.body.hideMap).toBe(true);
    // gallery1photo.jpg has explicit fixture coords; verify they're nulled.
    const photo = result.body.photos.find(
      (p: any) => p.id === "gallery1photo.jpg"
    );
    expect(photo).toBeDefined();
    expect(photo.taken.location.coordinates.latitude).toBeNull();
    expect(photo.taken.location.coordinates.longitude).toBeNull();
    expect(photo.taken.location.coordinates.altitude).toBeNull();
  });

  test("leaves coords untouched when hide_map is undefined", async () => {
    spy.mockResolvedValue(undefined);
    const result = await getGallery(token, "gallery1");
    expect(result.body.hideMap).toBe(false);
    const photo = result.body.photos.find(
      (p: any) => p.id === "gallery1photo.jpg"
    );
    expect(photo.taken.location.coordinates.latitude).toBe(35.6595);
    expect(photo.taken.location.coordinates.longitude).toBe(139.7005);
  });
});

describe("Mutations as guest", () => {
  test("Create rejected", () =>
    api
      .post("/api/v1/galleries")
      .send({ id: "newgal", title: "x" })
      .expect(403));
  test("Update rejected", () =>
    api.put("/api/v1/galleries/gallery1").send({ title: "x" }).expect(403));
  test("Delete rejected", () =>
    api.delete("/api/v1/galleries/gallery1").expect(403));
});

describe("Mutations as gallery1admin", () => {
  let token: string;
  beforeEach(async () => {
    token = await loginUser(api, "gallery1admin");
  });
  test("Create rejected (admin-only)", () =>
    api
      .post("/api/v1/galleries")
      .set("Authorization", `Bearer ${token}`)
      .send({ id: "newgal", title: "x" })
      .expect(403));
  test("Update own gallery", () =>
    api
      .put("/api/v1/galleries/gallery1")
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "renamed" })
      .expect(204));
  test("Update other gallery rejected", () =>
    api
      .put("/api/v1/galleries/gallery2")
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "renamed" })
      .expect(403));
  test("Delete own gallery rejected (admin-only)", () =>
    api
      .delete("/api/v1/galleries/gallery1")
      .set("Authorization", `Bearer ${token}`)
      .expect(403));
  test("Delete other gallery rejected", () =>
    api
      .delete("/api/v1/galleries/gallery2")
      .set("Authorization", `Bearer ${token}`)
      .expect(403));
  test("Update with hostname rejected (admin-only)", () =>
    api
      .put("/api/v1/galleries/gallery1")
      .set("Authorization", `Bearer ${token}`)
      .send({ hostname: "example.com" })
      .expect(403));
});

describe("Mutations as admin", () => {
  let token: string;
  beforeEach(async () => {
    token = await loginUser(api, "admin");
  });
  test("Create new gallery", async () => {
    await api
      .post("/api/v1/galleries")
      .set("Authorization", `Bearer ${token}`)
      .send({
        id: "freshgal",
        title: "Fresh",
        description: "Fresh gallery for the test",
      })
      .expect(201);
    // GET it back from the public list (admin sees all).
    const result = await api
      .get("/api/v1/galleries")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(result.body.some((g: { id: string }) => g.id === "freshgal")).toBe(
      true
    );
  });
  test("Update gallery", () =>
    api
      .put("/api/v1/galleries/gallery1")
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "renamed" })
      .expect(204));
  test("Delete gallery", () =>
    api
      .delete("/api/v1/galleries/gallery1")
      .set("Authorization", `Bearer ${token}`)
      .expect(204));
  test("Create with invalid body → 400", () =>
    api
      .post("/api/v1/galleries")
      .set("Authorization", `Bearer ${token}`)
      .send({ id: "" })
      .expect(400));
  test("Update with invalid body → 400", () =>
    api
      .put("/api/v1/galleries/gallery1")
      .set("Authorization", `Bearer ${token}`)
      .send("not even json")
      .set("Content-Type", "application/json")
      .expect(400));
  test("Update with unknown theme → 400", () =>
    api
      .put("/api/v1/galleries/gallery1")
      .set("Authorization", `Bearer ${token}`)
      .send({ theme: "bw" })
      .expect(400));
  test("Update with unknown initialView → 400", () =>
    api
      .put("/api/v1/galleries/gallery1")
      .set("Authorization", `Bearer ${token}`)
      .send({ initialView: "decade" })
      .expect(400));
  test("Update with unknown epochType → 400", () =>
    api
      .put("/api/v1/galleries/gallery1")
      .set("Authorization", `Bearer ${token}`)
      .send({ epochType: "lunar" })
      .expect(400));
  test("Update with known enums accepted", () =>
    api
      .put("/api/v1/galleries/gallery1")
      .set("Authorization", `Bearer ${token}`)
      .send({ theme: "grayscale", initialView: "year", epochType: "birthday" })
      .expect(204));

  test("defaultLanguage change is purely metadata — canonical and overlays stay put", async () => {
    await api
      .put("/api/v1/galleries/gallery1")
      .set("Authorization", `Bearer ${token}`)
      .send({
        title: "Landscapes",
        description: "Scenic shots.",
        defaultLanguage: "en",
        titleLocalized: { fi: "Maisemia" },
        descriptionLocalized: { fi: "Maisemakuvia." },
      })
      .expect(204);
    await api
      .put("/api/v1/galleries/gallery1")
      .set("Authorization", `Bearer ${token}`)
      .send({ defaultLanguage: "fi" })
      .expect(204);
    const after = await api
      .get("/api/v1/galleries/gallery1")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(after.body.defaultLanguage).toBe("fi");
    // Canonical column is untouched — the operator is expected to
    // rotate content manually if they want it to match the new
    // primary's language.
    expect(after.body.title).toBe("Landscapes");
    expect(after.body.description).toBe("Scenic shots.");
    expect(after.body.titleLocalized).toEqual({ fi: "Maisemia" });
    expect(after.body.descriptionLocalized).toEqual({ fi: "Maisemakuvia." });
  });
});


// Virtual galleries (#22): live-resolved unions of source galleries.
describe("Virtual galleries", () => {
  let token: string;
  beforeAll(async () => {
    token = await loginUser(api, "admin");
  });
  // The outer file-level `beforeEach` reseeds the fixture before
  // every test, so each test that touches virt_a needs to create it
  // anew. Tests that exercise create explicitly call POST; tests
  // that exercise update/delete need virt_a pre-existing.
  const createVirt = async (sources: string[]) =>
    api
      .post("/api/v1/galleries")
      .set("Authorization", `Bearer ${token}`)
      .send({ id: "virt_a", title: "Virtual A", sources })
      .expect(201);

  test("create with sources → virtual gallery resolves to source photos", async () => {
    await api
      .post("/api/v1/galleries")
      .set("Authorization", `Bearer ${token}`)
      .send({
        id: "virt_a",
        title: "Virtual A",
        sources: ["gallery1", "gallery2"],
      })
      .expect(201);
    // Sources surface in the GET response.
    const res = await api
      .get("/api/v1/galleries/virt_a")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(res.body.sources).toEqual(["gallery1", "gallery2"]);
    // Photo set is the union — gallery1 (gallery1photo + gallery12photo),
    // gallery2 (gallery12photo + gallery2photo). gallery12photo is in
    // both; the photo `id IN (...)` outer membership dedupes.
    const photosRes = await api
      .get("/api/v1/gallery-photos/virt_a")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    const ids = (photosRes.body as Array<{ id: string }>).map((p) => p.id).sort();
    expect(ids).toEqual(
      ["gallery1photo.jpg", "gallery12photo.jpg", "gallery2photo.jpg"].sort()
    );
  });

  test("update sources changes the resolved set", async () => {
    await createVirt(["gallery1", "gallery2"]);
    await api
      .put("/api/v1/galleries/virt_a")
      .set("Authorization", `Bearer ${token}`)
      .send({ sources: ["gallery1"] })
      .expect(204);
    const photosRes = await api
      .get("/api/v1/gallery-photos/virt_a")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    const ids = (photosRes.body as Array<{ id: string }>).map((p) => p.id).sort();
    expect(ids).toEqual(["gallery1photo.jpg", "gallery12photo.jpg"].sort());
  });

  test("link / unlink on a virtual gallery → 422", async () => {
    await createVirt(["gallery1", "gallery2"]);
    await api
      .put("/api/v1/gallery-photos/virt_a/gallery2photo.jpg")
      .set("Authorization", `Bearer ${token}`)
      .expect(422);
    await api
      .delete("/api/v1/gallery-photos/virt_a/gallery1photo.jpg")
      .set("Authorization", `Bearer ${token}`)
      .expect(422);
  });

  test("self-reference in sources → 422", async () => {
    await createVirt(["gallery1"]);
    await api
      .put("/api/v1/galleries/virt_a")
      .set("Authorization", `Bearer ${token}`)
      .send({ sources: ["virt_a"] })
      .expect(422);
  });

  test("source must exist → 422", async () => {
    await createVirt(["gallery1"]);
    await api
      .put("/api/v1/galleries/virt_a")
      .set("Authorization", `Bearer ${token}`)
      .send({ sources: ["nonexistent_gallery"] })
      .expect(422);
  });

  test("chained virtual sources → 422", async () => {
    await createVirt(["gallery1"]);
    await api
      .post("/api/v1/galleries")
      .set("Authorization", `Bearer ${token}`)
      .send({
        id: "virt_b",
        title: "Virtual B",
        sources: ["virt_a"],
      })
      .expect(422);
  });

  test("sources=[] turns a virtual gallery back into a real one", async () => {
    await createVirt(["gallery1", "gallery2"]);
    await api
      .put("/api/v1/galleries/virt_a")
      .set("Authorization", `Bearer ${token}`)
      .send({ sources: [] })
      .expect(204);
    const res = await api
      .get("/api/v1/galleries/virt_a")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(res.body.sources).toBeUndefined();
    // No gallery_photo rows linked to virt_a — empty list now.
    const photosRes = await api
      .get("/api/v1/gallery-photos/virt_a")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(photosRes.body).toEqual([]);
  });

  test("delete a virtual gallery does not unlink source photos", async () => {
    await createVirt(["gallery1", "gallery2"]);
    await api
      .delete("/api/v1/galleries/virt_a")
      .set("Authorization", `Bearer ${token}`)
      .expect(204);
    const gallery1 = await api
      .get("/api/v1/gallery-photos/gallery1")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(gallery1.body).not.toEqual([]);
  });

  test("cannot convert a real gallery to virtual while it's a source elsewhere", async () => {
    // virt_a sources [gallery1]. Now try to make gallery1 virtual
    // (sourced from gallery2). The check fires because gallery1 is
    // already referenced as a source — the resulting chain would
    // silently leave virt_a resolving to an empty photo set.
    await createVirt(["gallery1"]);
    await api
      .put("/api/v1/galleries/gallery1")
      .set("Authorization", `Bearer ${token}`)
      .send({ sources: ["gallery2"] })
      .expect(422);
  });
});
