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

const getPhotos = async (token: string | undefined, status = 200) =>
  api.get("/api/v1/photos").set("Authorization", `Bearer ${token}`).expect(status);

const getPhoto = async (token: string | undefined, photoId: string, status = 200) =>
  api
    .get(`/api/v1/photos/${photoId}`)
    .set("Authorization", `Bearer ${token}`)
    .expect(status);

const expectPhoto = (result: { body: Record<string, { id: string }> }, photo: string) => {
  expect(result.body[photo]).toBeDefined();
  expect(result.body[photo].id).toBe(photo);
};

describe("As guest", () => {
  test("List photos", async () => {
    await api.get("/api/v1/photos").expect(403);
  });
  test("Get gallery1photo.jpg", async () => {
    await api.get("/api/v1/photo/gallery1photo.jpg").expect(404);
  });
  test("Get gallery12photo.jpg", async () => {
    await api.get("/api/v1/photo/gallery12photo.jpg").expect(404);
  });
  test("Get gallery2photo.jpg", async () => {
    await api.get("/api/v1/photo/gallery2photo.jpg").expect(404);
  });
  test("Get gallery3photo.jpg", async () => {
    await api.get("/api/v1/photo/gallery3photo.jpg").expect(404);
  });
  test("Get orphanphoto.jpg", async () => {
    await api.get("/api/v1/photo/orphanphoto.jpg").expect(404);
  });
  test("Get invalid", async () => {
    await api.get("/api/v1/photo/invalid.jpg").expect(404);
  });
});

describe("As blockedUser", () => {
  let token: string | undefined = undefined;
  beforeAll(async () => {
    token = await loginUser(api, "blockedUser");
  });

  test("List photos", async () => {
    await getPhotos(token, 403);
  });
  test("Get gallery1photo.jpg", async () => {
    await getPhoto(token, "gallery1photo.jpg", 403);
  });
  test("Get gallery12photo.jpg", async () => {
    await getPhoto(token, "gallery12photo.jpg", 403);
  });
  test("Get gallery2photo.jpg", async () => {
    await getPhoto(token, "gallery2photo.jpg", 403);
  });
  test("Get gallery3photo.jpg", async () => {
    await getPhoto(token, "gallery3photo.jpg", 403);
  });
  test("Get orphanphoto.jpg", async () => {
    await getPhoto(token, "orphanphoto.jpg", 403);
  });
  test("Get invalid", async () => {
    await getPhoto(token, "invalid.jpg", 403);
  });
});

describe("As simpleUser", () => {
  let token: string | undefined = undefined;
  beforeAll(async () => {
    token = await loginUser(api, "simpleUser");
  });

  test("List photos", async () => {
    await getPhotos(token, 403);
  });
  test("Get gallery1photo.jpg", async () => {
    await getPhoto(token, "gallery1photo.jpg", 403);
  });
  test("Get gallery12photo.jpg", async () => {
    await getPhoto(token, "gallery12photo.jpg", 403);
  });
  test("Get gallery2photo.jpg", async () => {
    await getPhoto(token, "gallery2photo.jpg", 403);
  });
  test("Get gallery3photo.jpg", async () => {
    await getPhoto(token, "gallery3photo.jpg", 403);
  });
  test("Get orphanphoto.jpg", async () => {
    await getPhoto(token, "orphanphoto.jpg", 403);
  });
  test("Get invalid", async () => {
    await getPhoto(token, "invalid.jpg", 403);
  });
});

describe("As admin", () => {
  let token: string | undefined = undefined;
  beforeAll(async () => {
    token = await loginUser(api, "admin");
  });

  test("List photos", async () => {
    const result = await getPhotos(token);
    expect(Object.keys(result.body).length).toBe(5);
    expectPhoto(result, "gallery1photo.jpg");
    expectPhoto(result, "gallery12photo.jpg");
    expectPhoto(result, "gallery2photo.jpg");
    expectPhoto(result, "gallery3photo.jpg");
    expectPhoto(result, "orphanphoto.jpg");
  });
  test("Get gallery1photo.jpg", async () => {
    const result = await getPhoto(token, "gallery1photo.jpg");
    expect(result.body.id).toBeDefined();
    expect(result.body.id).toBe("gallery1photo.jpg");
  });
  test("Get gallery12photo.jpg", async () => {
    const result = await getPhoto(token, "gallery12photo.jpg");
    expect(result.body.id).toBeDefined();
    expect(result.body.id).toBe("gallery12photo.jpg");
  });
  test("Get gallery2photo.jpg", async () => {
    const result = await getPhoto(token, "gallery2photo.jpg");
    expect(result.body.id).toBeDefined();
    expect(result.body.id).toBe("gallery2photo.jpg");
  });
  test("Get gallery3photo.jpg", async () => {
    const result = await getPhoto(token, "gallery3photo.jpg");
    expect(result.body.id).toBeDefined();
    expect(result.body.id).toBe("gallery3photo.jpg");
  });
  test("Get orphanphoto.jpg", async () => {
    const result = await getPhoto(token, "orphanphoto.jpg");
    expect(result.body.id).toBeDefined();
    expect(result.body.id).toBe("orphanphoto.jpg");
  });
  test("Get invalid", async () => {
    await getPhoto(token, "invalid.jpg", 404);
  });
});

describe("As gallery1Admin", () => {
  let token: string | undefined = undefined;
  beforeAll(async () => {
    token = await loginUser(api, "gallery1Admin");
  });

  test("List photos", async () => {
    const result = await getPhotos(token);
    expect(Object.keys(result.body).length).toBe(5);
    expectPhoto(result, "gallery1photo.jpg");
    expectPhoto(result, "gallery12photo.jpg");
    expectPhoto(result, "gallery2photo.jpg");
    expectPhoto(result, "gallery3photo.jpg");
    expectPhoto(result, "orphanphoto.jpg");
  });
  test("Get gallery1photo.jpg", async () => {
    const result = await getPhoto(token, "gallery1photo.jpg");
    expect(result.body.id).toBeDefined();
    expect(result.body.id).toBe("gallery1photo.jpg");
  });
  test("Get gallery12photo.jpg", async () => {
    const result = await getPhoto(token, "gallery12photo.jpg");
    expect(result.body.id).toBeDefined();
    expect(result.body.id).toBe("gallery12photo.jpg");
  });
  test("Get gallery2photo.jpg", async () => {
    const result = await getPhoto(token, "gallery2photo.jpg");
    expect(result.body.id).toBeDefined();
    expect(result.body.id).toBe("gallery2photo.jpg");
  });
  test("Get gallery3photo.jpg", async () => {
    const result = await getPhoto(token, "gallery3photo.jpg");
    expect(result.body.id).toBeDefined();
    expect(result.body.id).toBe("gallery3photo.jpg");
  });
  test("Get orphanphoto.jpg", async () => {
    const result = await getPhoto(token, "orphanphoto.jpg");
    expect(result.body.id).toBeDefined();
    expect(result.body.id).toBe("orphanphoto.jpg");
  });
  test("Get invalid", async () => {
    await getPhoto(token, "invalid.jpg", 404);
  });
});

describe("As gallery2Admin", () => {
  let token: string | undefined = undefined;
  beforeAll(async () => {
    token = await loginUser(api, "gallery2Admin");
  });

  test("List photos", async () => {
    await getPhotos(token, 403);
  });
  test("Get gallery1photo.jpg", async () => {
    await getPhoto(token, "gallery1photo.jpg", 403);
  });
  test("Get gallery12photo.jpg", async () => {
    await getPhoto(token, "gallery12photo.jpg", 403);
  });
  test("Get gallery2photo.jpg", async () => {
    await getPhoto(token, "gallery2photo.jpg", 403);
  });
  test("Get gallery3photo.jpg", async () => {
    await getPhoto(token, "gallery3photo.jpg", 403);
  });
  test("Get orphanphoto.jpg", async () => {
    await getPhoto(token, "orphanphoto.jpg", 403);
  });
  test("Get invalid", async () => {
    await getPhoto(token, "invalid.jpg", 403);
  });
});

describe("As plainUser", () => {
  let token: string | undefined = undefined;
  beforeAll(async () => {
    token = await loginUser(api, "plainUser");
  });

  test("List photos", async () => {
    const result = await getPhotos(token);
    expect(Object.keys(result.body).length).toBe(5);
    expectPhoto(result, "gallery1photo.jpg");
    expectPhoto(result, "gallery12photo.jpg");
    expectPhoto(result, "gallery2photo.jpg");
    expectPhoto(result, "gallery3photo.jpg");
    expectPhoto(result, "orphanphoto.jpg");
  });
  test("Get gallery1photo.jpg", async () => {
    const result = await getPhoto(token, "gallery1photo.jpg");
    expect(result.body.id).toBeDefined();
    expect(result.body.id).toBe("gallery1photo.jpg");
  });
  test("Get gallery12photo.jpg", async () => {
    const result = await getPhoto(token, "gallery12photo.jpg");
    expect(result.body.id).toBeDefined();
    expect(result.body.id).toBe("gallery12photo.jpg");
  });
  test("Get gallery2photo.jpg", async () => {
    const result = await getPhoto(token, "gallery2photo.jpg");
    expect(result.body.id).toBeDefined();
    expect(result.body.id).toBe("gallery2photo.jpg");
  });
  test("Get gallery3photo.jpg", async () => {
    const result = await getPhoto(token, "gallery3photo.jpg");
    expect(result.body.id).toBeDefined();
    expect(result.body.id).toBe("gallery3photo.jpg");
  });
  test("Get orphanphoto.jpg", async () => {
    const result = await getPhoto(token, "orphanphoto.jpg");
    expect(result.body.id).toBeDefined();
    expect(result.body.id).toBe("orphanphoto.jpg");
  });
  test("Get invalid", async () => {
    await getPhoto(token, "invalid.jpg", 404);
  });
});

describe("As gallery1User", () => {
  let token: string | undefined = undefined;
  beforeAll(async () => {
    token = await loginUser(api, "gallery1User");
  });

  test("List photos", async () => {
    await getPhotos(token, 403);
  });
  test("Get gallery1photo.jpg", async () => {
    await getPhoto(token, "gallery1photo.jpg", 403);
  });
  test("Get gallery12photo.jpg", async () => {
    await getPhoto(token, "gallery12photo.jpg", 403);
  });
  test("Get gallery2photo.jpg", async () => {
    await getPhoto(token, "gallery2photo.jpg", 403);
  });
  test("Get gallery3photo.jpg", async () => {
    await getPhoto(token, "gallery3photo.jpg", 403);
  });
  test("Get orphanphoto.jpg", async () => {
    await getPhoto(token, "orphanphoto.jpg", 403);
  });
  test("Get invalid", async () => {
    await getPhoto(token, "invalid.jpg", 403);
  });
});

describe("As gallery12User", () => {
  let token: string | undefined = undefined;
  beforeAll(async () => {
    token = await loginUser(api, "gallery12User");
  });

  test("List photos", async () => {
    await getPhotos(token, 403);
  });
  test("Get gallery1photo.jpg", async () => {
    await getPhoto(token, "gallery1photo.jpg", 403);
  });
  test("Get gallery12photo.jpg", async () => {
    await getPhoto(token, "gallery12photo.jpg", 403);
  });
  test("Get gallery2photo.jpg", async () => {
    await getPhoto(token, "gallery2photo.jpg", 403);
  });
  test("Get gallery3photo.jpg", async () => {
    await getPhoto(token, "gallery3photo.jpg", 403);
  });
  test("Get orphanphoto.jpg", async () => {
    await getPhoto(token, "orphanphoto.jpg", 403);
  });
  test("Get invalid", async () => {
    await getPhoto(token, "invalid.jpg", 403);
  });
});

describe("hide_map cascade applied to GET /photos and /photos/:id (regression #201)", () => {
  let token: string | undefined = undefined;
  let spy: ReturnType<typeof vi.spyOn>;
  beforeAll(async () => {
    token = await loginUser(api, "admin");
  });
  beforeEach(() => {
    spy = vi.spyOn(dbFacade, "resolveHideMap").mockResolvedValue(1);
  });
  afterEach(() => {
    spy.mockRestore();
  });

  test("/photos: coords nulled on the listed photos", async () => {
    const result = await getPhotos(token);
    const photo = result.body["gallery1photo.jpg"];
    expect(photo).toBeDefined();
    expect(photo.taken.location.coordinates.latitude).toBeNull();
    expect(photo.taken.location.coordinates.longitude).toBeNull();
    expect(photo.taken.location.coordinates.altitude).toBeNull();
  });

  test("/photos/:id: coords nulled on the single photo", async () => {
    const result = await getPhoto(token, "gallery1photo.jpg");
    expect(result.body.taken.location.coordinates.latitude).toBeNull();
    expect(result.body.taken.location.coordinates.longitude).toBeNull();
    expect(result.body.taken.location.coordinates.altitude).toBeNull();
  });

  test("coords untouched when hide_map is undefined", async () => {
    spy.mockResolvedValue(undefined);
    const result = await getPhoto(token, "gallery1photo.jpg");
    expect(result.body.taken.location.coordinates.latitude).toBe(35.6595);
    expect(result.body.taken.location.coordinates.longitude).toBe(139.7005);
  });
});

afterAll(() => {});
