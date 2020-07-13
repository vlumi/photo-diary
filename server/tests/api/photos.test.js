const supertest = require("supertest");
const app = require("../../app");

const api = supertest(app);
const db = require("../../db/dummy")();
const { loginUser } = require("./helper");

beforeEach(async () => {
  db.init();
});

const getPhotos = async (token, status = 200) =>
  api
    .get("/api/photos")
    .set("Cookie", [`token=${token}`])
    .expect(status);

const getPhoto = async (token, photoId, status = 200) =>
  api
    .get(`/api/photos/${photoId}`)
    .set("Cookie", [`token=${token}`])
    .expect(status);

const expectPhoto = (result, photo) => {
  expect(result.body[photo]).toBeDefined();
  expect(result.body[photo].id).toBe(photo);
};

describe("As Guest", () => {
  test("List photos", async () => {
    const result = await api.get("/api/photos").expect(403);
  });
  test("Get photo", async () => {
    await api.get("/api/photo/gallery1photo.jpg").expect(404);
  });
});

describe("As admin", () => {
  let token = undefined;
  beforeEach(async () => {
    token = await loginUser(api, "admin");
  });

  test("List photos", async () => {
    const result = await getPhotos(token);
    expect(Object.keys(result.body).length).toBe(4);
    expectPhoto(result, "gallery1photo.jpg");
    expectPhoto(result, "gallery12photo.jpg");
    expectPhoto(result, "gallery2photo.jpg");
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
  test("Get orphanphoto.jpg", async () => {
    const result = await getPhoto(token, "orphanphoto.jpg");
    expect(result.body.id).toBeDefined();
    expect(result.body.id).toBe("orphanphoto.jpg");
  });
  test("Get invalid", async () => {
    await getPhoto(token, "invalid", 404);
  });
});

describe("As gallery1Admin", () => {
  let token = undefined;
  beforeEach(async () => {
    token = await loginUser(api, "gallery1Admin");
  });

  test("List photos", async () => {
    const result = await getPhotos(token);
    expect(Object.keys(result.body).length).toBe(4);
    expectPhoto(result, "gallery1photo.jpg");
    expectPhoto(result, "gallery12photo.jpg");
    expectPhoto(result, "gallery2photo.jpg");
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
  test("Get orphanphoto.jpg", async () => {
    const result = await getPhoto(token, "orphanphoto.jpg");
    expect(result.body.id).toBeDefined();
    expect(result.body.id).toBe("orphanphoto.jpg");
  });
  test("Get invalid", async () => {
    await getPhoto(token, "invalid", 404);
  });
});

describe("As gallery2Admin", () => {
  let token = undefined;
  beforeEach(async () => {
    token = await loginUser(api, "gallery2Admin");
  });

  test("List photos", async () => {
    await getPhotos(token, 403);
  });
  test("Get gallery1photo.jpg", async () => {
    const result = await getPhoto(token, "gallery1photo.jpg", 403);
  });
  test("Get gallery12photo.jpg", async () => {
    const result = await getPhoto(token, "gallery12photo.jpg", 403);
  });
  test("Get gallery2photo.jpg", async () => {
    const result = await getPhoto(token, "gallery2photo.jpg", 403);
  });
  test("Get orphanphoto.jpg", async () => {
    const result = await getPhoto(token, "orphanphoto.jpg", 403);
  });
  test("Get invalid", async () => {
    await getPhoto(token, "invalid", 403);
  });
});

describe("As plainUser", () => {
  let token = undefined;
  beforeEach(async () => {
    token = await loginUser(api, "plainUser");
  });

  test("List photos", async () => {
    const result = await getPhotos(token);
    expect(Object.keys(result.body).length).toBe(4);
    expectPhoto(result, "gallery1photo.jpg");
    expectPhoto(result, "gallery12photo.jpg");
    expectPhoto(result, "gallery2photo.jpg");
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
  test("Get orphanphoto.jpg", async () => {
    const result = await getPhoto(token, "orphanphoto.jpg");
    expect(result.body.id).toBeDefined();
    expect(result.body.id).toBe("orphanphoto.jpg");
  });
  test("Get invalid", async () => {
    await getPhoto(token, "invalid", 404);
  });
});

describe("As gallery1User", () => {
  let token = undefined;
  beforeEach(async () => {
    token = await loginUser(api, "gallery1User");
  });

  test("List photos", async () => {
    await getPhotos(token, 403);
  });
  test("Get gallery1photo.jpg", async () => {
    const result = await getPhoto(token, "gallery1photo.jpg", 403);
  });
  test("Get gallery12photo.jpg", async () => {
    const result = await getPhoto(token, "gallery12photo.jpg", 403);
  });
  test("Get gallery2photo.jpg", async () => {
    const result = await getPhoto(token, "gallery2photo.jpg", 403);
  });
  test("Get orphanphoto.jpg", async () => {
    const result = await getPhoto(token, "orphanphoto.jpg", 403);
  });
  test("Get invalid", async () => {
    await getPhoto(token, "invalid", 403);
  });
});

describe("As gallery12User", () => {
  let token = undefined;
  beforeEach(async () => {
    token = await loginUser(api, "gallery12User");
  });

  test("List photos", async () => {
    await getPhotos(token, 403);
  });
  test("Get gallery1photo.jpg", async () => {
    const result = await getPhoto(token, "gallery1photo.jpg", 403);
  });
  test("Get gallery12photo.jpg", async () => {
    const result = await getPhoto(token, "gallery12photo.jpg", 403);
  });
  test("Get gallery2photo.jpg", async () => {
    const result = await getPhoto(token, "gallery2photo.jpg", 403);
  });
  test("Get orphanphoto.jpg", async () => {
    const result = await getPhoto(token, "orphanphoto.jpg", 403);
  });
  test("Get invalid", async () => {
    await getPhoto(token, "invalid", 403);
  });
});

afterAll(() => {});
