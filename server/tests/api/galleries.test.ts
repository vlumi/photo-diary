import { init } from "../../app.js";
import dummyFactory from "../../db/dummy.js";
import dbFacade from "../../db/index.js";
import { createApi, loginUser } from "./helper.js";

const db = dummyFactory();

const { api, close } = createApi();

beforeEach(async () => {
  await db.init();
  await init();
});

afterAll(close);

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
const expectGalleryAll = (result: { body: Record<string, any> }) => {
  expect(result.body.id).toBe(":all");
  const photos = result.body.photos;
  expect(photos).toBeDefined();
  expect(Object.keys(photos).length).toBe(5);
  expect(photos[0].id).toBe("gallery1photo.jpg");
  expect(photos[1].id).toBe("gallery12photo.jpg");
  expect(photos[2].id).toBe("gallery2photo.jpg");
  expect(photos[3].id).toBe("gallery3photo.jpg");
  expect(photos[4].id).toBe("orphanphoto.jpg");
};
const expectGalleryPublic = (result: { body: Record<string, any> }) => {
  expect(result.body.id).toBe(":public");
  const photos = result.body.photos;
  expect(photos).toBeDefined();
  expect(Object.keys(photos).length).toBe(4);
  expect(photos[0].id).toBe("gallery1photo.jpg");
  expect(photos[1].id).toBe("gallery12photo.jpg");
  expect(photos[2].id).toBe("gallery2photo.jpg");
  expect(photos[3].id).toBe("gallery3photo.jpg");
};
const expectGalleryPrivate = (result: { body: Record<string, any> }) => {
  expect(result.body.id).toBe(":private");
  const photos = result.body.photos;
  expect(photos).toBeDefined();
  expect(Object.keys(photos).length).toBe(1);
  expect(photos[0].id).toBe("orphanphoto.jpg");
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
  test("Get :private", async () => {
    await expectGalleryUnavailable(undefined, ":private");
  });
  test("Get invalid", async () => {
    await expectGalleryUnavailable(undefined, "invalid");
  });
});

describe("As blocked user", () => {
  let token: string | undefined = undefined;
  beforeAll(async () => {
    token = await loginUser(api, "blockedUser");
  });

  test("List galleries", async () => {
    // blockedUser has `:all=NONE`, which under the user-first cascade shadows
    // every :guest grant (including `:guest, gallery3, VIEW`). Logged in as
    // blockedUser, the visible list is empty.
    const result = await getGalleries(token);
    expect(result.body.length).toBe(0);
  });
  test("Get gallery1", async () => {
    await expectGalleryUnavailable(token, "gallery1");
  });
  test("Get gallery2", async () => {
    await expectGalleryUnavailable(token, "gallery2");
  });
  test("Get gallery3 (anonymous, not as blockedUser)", async () => {
    // Anonymous request — :guest has gallery3=VIEW, so this still works.
    const result = await api.get("/api/v1/galleries/gallery3").expect(200);
    expectGallery3(result);
  });
  test("Get :all", async () => {
    await expectGalleryUnavailable(token, ":all");
  });
  test("Get :public", async () => {
    await expectGalleryUnavailable(token, ":public");
  });
  test("Get :private", async () => {
    await expectGalleryUnavailable(token, ":private");
  });
  test("Get invalid", async () => {
    await expectGalleryUnavailable(token, "invalid");
  });
});

describe("As simple user", () => {
  let token: string | undefined = undefined;
  beforeAll(async () => {
    token = await loginUser(api, "simpleUser");
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
  test("Get :private", async () => {
    await expectGalleryUnavailable(token, ":private");
  });
  test("Get invalid", async () => {
    await expectGalleryUnavailable(token, "invalid");
  });
});

describe("As publicUser", () => {
  let token: string | undefined = undefined;
  beforeAll(async () => {
    token = await loginUser(api, "publicUser");
  });

  test("List galleries", async () => {
    const result = await getGalleries(token);
    expect(result.body.length).toBe(4);
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
    const result = await getGallery(token, ":public");
    expectGalleryPublic(result);
  });
  test("Get :private", async () => {
    await expectGalleryUnavailable(token, ":private");
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
    expect(result.body.length).toBe(6);
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
    const result = await getGallery(token, ":all");
    expectGalleryAll(result);
  });
  test("Get :public", async () => {
    const result = await getGallery(token, ":public");
    expectGalleryPublic(result);
  });
  test("Get :private", async () => {
    const result = await getGallery(token, ":private");
    expectGalleryPrivate(result);
  });
  test("Get invalid", async () => {
    await expectGalleryUnavailable(token, "invalid");
  });
});

describe("As gallery1Admin", () => {
  let token: string | undefined = undefined;
  beforeAll(async () => {
    token = await loginUser(api, "gallery1Admin");
  });

  test("List galleries", async () => {
    const result = await getGalleries(token);
    expect(result.body.length).toBe(6);
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
    const result = await getGallery(token, ":all");
    expectGalleryAll(result);
  });
  test("Get :public", async () => {
    const result = await getGallery(token, ":public");
    expectGalleryPublic(result);
  });
  test("Get :private", async () => {
    const result = await getGallery(token, ":private");
    expectGalleryPrivate(result);
  });
  test("Get invalid", async () => {
    await expectGalleryUnavailable(token, "invalid");
  });
});

describe("As gallery2Admin", () => {
  let token: string | undefined = undefined;
  beforeAll(async () => {
    token = await loginUser(api, "gallery2Admin");
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
  test("Get :private", async () => {
    await expectGalleryUnavailable(token, ":private");
  });
  test("Get invalid", async () => {
    await expectGalleryUnavailable(token, "invalid");
  });
});

describe("As plainUser", () => {
  let token: string | undefined = undefined;
  beforeAll(async () => {
    token = await loginUser(api, "plainUser");
  });

  test("List galleries", async () => {
    const result = await getGalleries(token);
    expect(result.body.length).toBe(6);
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
    const result = await getGallery(token, ":all");
    expectGalleryAll(result);
  });
  test("Get :public", async () => {
    const result = await getGallery(token, ":public");
    expectGalleryPublic(result);
  });
  test("Get :private", async () => {
    const result = await getGallery(token, ":private");
    expectGalleryPrivate(result);
  });
  test("Get invalid", async () => {
    await expectGalleryUnavailable(token, "invalid");
  });
});

describe("As gallery1User", () => {
  let token: string | undefined = undefined;
  beforeAll(async () => {
    token = await loginUser(api, "gallery1User");
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
  test("Get :private", async () => {
    await expectGalleryUnavailable(token, ":private");
  });
  test("Get invalid", async () => {
    await expectGalleryUnavailable(token, "invalid");
  });
});

describe("As gallery12User", () => {
  let token: string | undefined = undefined;
  beforeAll(async () => {
    token = await loginUser(api, "gallery12User");
  });

  test("List galleries", async () => {
    const result = await getGalleries(token);
    expect(result.body.length).toBe(2);
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
    await expectGalleryUnavailable(token, "gallery3");
  });
  test("Get :all", async () => {
    await expectGalleryUnavailable(token, ":all");
  });
  test("Get :public", async () => {
    await expectGalleryUnavailable(token, ":public");
  });
  test("Get :private", async () => {
    await expectGalleryUnavailable(token, ":private");
  });
  test("Get invalid", async () => {
    await expectGalleryUnavailable(token, "invalid");
  });
});

describe("hide_map cascade applied to GET /galleries/:id", () => {
  let token: string | undefined = undefined;
  let spy: ReturnType<typeof vi.spyOn>;
  beforeAll(async () => {
    token = await loginUser(api, "plainUser");
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

describe("Mutations as gallery1Admin", () => {
  let token: string;
  beforeEach(async () => {
    token = await loginUser(api, "gallery1Admin");
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
  test("Delete own gallery", () =>
    api
      .delete("/api/v1/galleries/gallery1")
      .set("Authorization", `Bearer ${token}`)
      .expect(204));
  test("Delete other gallery rejected", () =>
    api
      .delete("/api/v1/galleries/gallery2")
      .set("Authorization", `Bearer ${token}`)
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
});

afterAll(() => {});
