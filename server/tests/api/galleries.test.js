const supertest = require("supertest");
const { app, init } = require("../../app");

const api = supertest(app);
const db = require("../../db/dummy")();
const { loginUser } = require("./helper");

beforeEach(async () => {
  await db.init();
  await init();
});

const getGalleries = async (token, status = 200) =>
  api
    .get("/api/galleries")
    .set("Authorization", `Bearer ${token}`)
    .expect(status);

const getGallery = async (token, galleryId, status = 200) =>
  api
    .get(`/api/galleries/${galleryId}`)
    .set("Authorization", `Bearer ${token}`)
    .expect(status);

const expectGallery1 = (result) => {
  expect(result.body.id).toBe("gallery1");
  expect(result.body.title).toBe("gallery 1");
  expect(result.body.description).toBe("This is the first gallery");
  const photos = result.body.photos;
  expect(photos).toBeDefined();
  expect(Object.keys(photos).length).toBe(2);
  expect(Object.keys(photos[2018]).length).toBe(1);
  expect(Object.keys(photos[2018][5]).length).toBe(1);
  expect(Object.keys(photos[2018][5][4]).length).toBe(1);
  expect(photos[2018][5][4][0].id).toBe("gallery1photo.jpg");
  expect(Object.keys(photos[2020]).length).toBe(1);
  expect(Object.keys(photos[2020][7]).length).toBe(1);
  expect(Object.keys(photos[2020][7][4]).length).toBe(1);
  expect(photos[2020][7][4][0].id).toBe("gallery12photo.jpg");
};
const expectGallery2 = (result) => {
  expect(result.body.id).toBe("gallery2");
  expect(result.body.title).toBe("gallery 2");
  expect(result.body.description).toBe("This is the second gallery");
  const photos = result.body.photos;
  expect(photos).toBeDefined();
  expect(Object.keys(photos).length).toBe(1);
  expect(Object.keys(photos[2020]).length).toBe(1);
  expect(Object.keys(photos[2020][7]).length).toBe(2);
  expect(Object.keys(photos[2020][7][4]).length).toBe(1);
  expect(photos[2020][7][4][0].id).toBe("gallery12photo.jpg");
  expect(Object.keys(photos[2020][7][5]).length).toBe(1);
  expect(photos[2020][7][5][0].id).toBe("gallery2photo.jpg");
};
const expectGallery3 = (result) => {
  expect(result.body.id).toBe("gallery3");
  expect(result.body.title).toBe("gallery 3");
  expect(result.body.description).toBe("This is the third gallery");
  const photos = result.body.photos;
  expect(photos).toBeDefined();
  expect(Object.keys(photos).length).toBe(1);
  expect(Object.keys(photos[2020]).length).toBe(1);
  expect(Object.keys(photos[2020][7]).length).toBe(1);
  expect(Object.keys(photos[2020][7][6]).length).toBe(1);
  expect(photos[2020][7][6][0].id).toBe("gallery3photo.jpg");
};
const expectGalleryAll = (result) => {
  expect(result.body.id).toBe(":all");
  const photos = result.body.photos;
  expect(photos).toBeDefined();
  expect(Object.keys(photos).length).toBe(2);
  expect(Object.keys(photos[2018]).length).toBe(1);
  expect(Object.keys(photos[2018][5]).length).toBe(1);
  expect(Object.keys(photos[2018][5][4]).length).toBe(1);
  expect(photos[2018][5][4][0].id).toBe("gallery1photo.jpg");
  expect(Object.keys(photos[2020]).length).toBe(2);
  expect(Object.keys(photos[2020][7]).length).toBe(3);
  expect(Object.keys(photos[2020][7][4]).length).toBe(1);
  expect(photos[2020][7][4][0].id).toBe("gallery12photo.jpg");
  expect(Object.keys(photos[2020][7][5]).length).toBe(1);
  expect(photos[2020][7][5][0].id).toBe("gallery2photo.jpg");
  expect(Object.keys(photos[2020][7][6]).length).toBe(1);
  expect(photos[2020][7][6][0].id).toBe("gallery3photo.jpg");
  expect(Object.keys(photos[2020][8]).length).toBe(1);
  expect(Object.keys(photos[2020][8][5]).length).toBe(1);
  expect(photos[2020][8][5][0].id).toBe("orphanphoto.jpg");
};
const expectGalleryPublic = (result) => {
  expect(result.body.id).toBe(":public");
  const photos = result.body.photos;
  expect(photos).toBeDefined();
  expect(Object.keys(photos).length).toBe(2);
  expect(Object.keys(photos[2018]).length).toBe(1);
  expect(Object.keys(photos[2018][5]).length).toBe(1);
  expect(Object.keys(photos[2018][5][4]).length).toBe(1);
  expect(photos[2018][5][4][0].id).toBe("gallery1photo.jpg");
  expect(Object.keys(photos[2020]).length).toBe(1);
  expect(Object.keys(photos[2020][7]).length).toBe(3);
  expect(Object.keys(photos[2020][7][4]).length).toBe(1);
  expect(photos[2020][7][4][0].id).toBe("gallery12photo.jpg");
  expect(Object.keys(photos[2020][7][5]).length).toBe(1);
  expect(photos[2020][7][5][0].id).toBe("gallery2photo.jpg");
  expect(Object.keys(photos[2020][7][6]).length).toBe(1);
  expect(photos[2020][7][6][0].id).toBe("gallery3photo.jpg");
};
const expectGalleryPrivate = (result) => {
  expect(result.body.id).toBe(":private");
  const photos = result.body.photos;
  expect(photos).toBeDefined();
  expect(Object.keys(photos).length).toBe(1);
  expect(Object.keys(photos[2020]).length).toBe(1);
  expect(Object.keys(photos[2020][8]).length).toBe(1);
  expect(Object.keys(photos[2020][8][5]).length).toBe(1);
  expect(photos[2020][8][5][0].id).toBe("orphanphoto.jpg");
};

describe("As guest", () => {
  test("List galleries", async () => {
    const result = await api
      .get("/api/galleries")
      .expect(200)
      .expect("Content-Type", /application\/json/);
    expect(result.body.length).toBe(1);
  });
  test("Get gallery1", async () => {
    await api.get("/api/galleries/gallery1").expect(403);
  });
  test("Get gallery2", async () => {
    await api.get("/api/galleries/gallery2").expect(403);
  });
  test("Get gallery3", async () => {
    const result = await api.get("/api/galleries/gallery3").expect(200);
    expectGallery3(result);
  });
  test("Get :all", async () => {
    await api.get("/api/galleries/:all").expect(403);
  });
  test("Get :public", async () => {
    await api.get("/api/galleries/:public").expect(403);
  });
  test("Get :private", async () => {
    await api.get("/api/galleries/:private").expect(403);
  });
  test("Get invalid", async () => {
    await api.get("/api/galleries/invalid").expect(403);
  });
});

describe("As blocked user", () => {
  let token = undefined;
  beforeAll(async () => {
    token = await loginUser(api, "blockedUser");
  });

  test("List galleries", async () => {
    const result = await getGalleries(token);
    expect(result.body.length).toBe(0);
  });
  test("Get gallery1", async () => {
    await getGallery(token, "gallery1", 403);
  });
  test("Get gallery2", async () => {
    await getGallery(token, "gallery2", 403);
  });
  test("Get gallery3", async () => {
    await getGallery(token, "gallery3", 403);
  });
  test("Get :all", async () => {
    await getGallery(token, ":all", 403);
  });
  test("Get :public", async () => {
    await getGallery(token, ":public", 403);
  });
  test("Get :private", async () => {
    await getGallery(token, ":private", 403);
  });
  test("Get invalid", async () => {
    await getGallery(token, "invalid", 403);
  });
});

describe("As simple user", () => {
  let token = undefined;
  beforeAll(async () => {
    token = await loginUser(api, "simpleUser");
  });

  test("List galleries", async () => {
    const result = await getGalleries(token);
    expect(result.body.length).toBe(1);
  });
  test("Get gallery1", async () => {
    await getGallery(token, "gallery1", 403);
  });
  test("Get gallery2", async () => {
    await getGallery(token, "gallery2", 403);
  });
  test("Get gallery3", async () => {
    const result = await getGallery(token, "gallery3", 200);
    expectGallery3(result);
  });
  test("Get :all", async () => {
    await getGallery(token, ":all", 403);
  });
  test("Get :public", async () => {
    await getGallery(token, ":public", 403);
  });
  test("Get :private", async () => {
    await getGallery(token, ":private", 403);
  });
  test("Get invalid", async () => {
    await getGallery(token, "invalid", 403);
  });
});

describe("As admin", () => {
  let token = undefined;
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
    await getGallery(token, "invalid", 404);
  });
});

describe("As gallery1Admin", () => {
  let token = undefined;
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
    await getGallery(token, "invalid", 404);
  });
});

describe("As gallery2Admin", () => {
  let token = undefined;
  beforeAll(async () => {
    token = await loginUser(api, "gallery2Admin");
  });

  test("List galleries", async () => {
    const result = await getGalleries(token);
    expect(result.body.length).toBe(2);
  });
  test("Get gallery1", async () => {
    await getGallery(token, "gallery1", 403);
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
    await getGallery(token, ":all", 403);
  });
  test("Get :public", async () => {
    await getGallery(token, ":public", 403);
  });
  test("Get :private", async () => {
    await getGallery(token, ":private", 403);
  });
  test("Get invalid", async () => {
    await getGallery(token, "invalid", 403);
  });
});

describe("As plainUser", () => {
  let token = undefined;
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
    await getGallery(token, "invalid", 404);
  });
});

describe("As gallery1User", () => {
  let token = undefined;
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
    await getGallery(token, "gallery2", 403);
  });
  test("Get :all", async () => {
    await getGallery(token, ":all", 403);
  });
  test("Get :public", async () => {
    await getGallery(token, ":public", 403);
  });
  test("Get :private", async () => {
    await getGallery(token, ":private", 403);
  });
  test("Get invalid", async () => {
    await getGallery(token, "invalid", 403);
  });
});

describe("As gallery12User", () => {
  let token = undefined;
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
    await getGallery(token, "gallery3", 403);
  });
  test("Get :all", async () => {
    await getGallery(token, ":all", 403);
  });
  test("Get :public", async () => {
    await getGallery(token, ":public", 403);
  });
  test("Get :private", async () => {
    await getGallery(token, ":private", 403);
  });
  test("Get invalid", async () => {
    await getGallery(token, "invalid", 403);
  });
});

afterAll(() => {});
