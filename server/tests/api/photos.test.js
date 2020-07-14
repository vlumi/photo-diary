const supertest = require("supertest");
const app = require("../../app");

const api = supertest(app);
const db = require("../../db/dummy")();
const { loginUser } = require("./helper");

beforeEach(async () => {
  db.init();
});

const getPhotos = async (token, status = 200) =>
  api.get("/api/photos").set("Authorization", `Bearer ${token}`).expect(status);

const getPhoto = async (token, photoId, status = 200) =>
  api
    .get(`/api/photos/${photoId}`)
    .set("Authorization", `Bearer ${token}`)
    .expect(status);

const expectPhoto = (result, photo) => {
  expect(result.body[photo]).toBeDefined();
  expect(result.body[photo].id).toBe(photo);
};

describe("As guest", () => {
  test("List photos", async () => {
    await api.get("/api/photos").expect(403);
  });
  test("Get gallery1photo.jpg", async () => {
    await api.get("/api/photo/gallery1photo.jpg").expect(404);
  });
  test("Get gallery12photo.jpg", async () => {
    await api.get("/api/photo/gallery12photo.jpg").expect(404);
  });
  test("Get gallery2photo.jpg", async () => {
    await api.get("/api/photo/gallery2photo.jpg").expect(404);
  });
  test("Get gallery3photo.jpg", async () => {
    await api.get("/api/photo/gallery3photo.jpg").expect(404);
  });
  test("Get orphanphoto.jpg", async () => {
    await api.get("/api/photo/orphanphoto.jpg").expect(404);
  });
  test("Get invalid", async () => {
    await api.get("/api/photo/invalid.jpg").expect(404);
  });
});

describe("As blockedUser", () => {
  let token = undefined;
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
  let token = undefined;
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
  let token = undefined;
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
  let token = undefined;
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
  let token = undefined;
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
  let token = undefined;
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
  let token = undefined;
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
  let token = undefined;
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

afterAll(() => {});
