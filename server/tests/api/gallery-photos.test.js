const supertest = require("supertest");
const app = require("../../app");

const api = supertest(app);
const db = require("../../db/dummy")();
const { loginUser } = require("./helper");

beforeEach(async () => {
  db.init();
});

const getGalleryPhoto = async (token, galleryId, photoId, status = 200) =>
  api
    .get(`/api/gallery-photos/${galleryId}/${photoId}`)
    .set("Cookie", [`token=${token}`])
    .expect(status);

describe("As guest", () => {
  test("Get gallery1/gallery1photo.jpg", async () => {
    await api.get("/api/gallery-photos/gallery1/gallery1photo.jpg").expect(403);
  });
  test("Get gallery2/gallery1photo.jpg", async () => {
    await api.get("/api/gallery-photos/gallery2/gallery1photo.jpg").expect(403);
  });
  test("Get gallery1/gallery12photo.jpg", async () => {
    await api
      .get("/api/gallery-photos/gallery1/gallery12photo.jpg")
      .expect(403);
  });
  test("Get gallery2/gallery12photo.jpg", async () => {
    await api
      .get("/api/gallery-photos/gallery2/gallery12photo.jpg")
      .expect(403);
  });
  test("Get gallery1/gallery2photo.jpg", async () => {
    await api.get("/api/gallery-photos/gallery1/gallery2photo.jpg").expect(403);
  });
  test("Get gallery2/gallery2photo.jpg", async () => {
    await api.get("/api/gallery-photos/gallery2/gallery2photo.jpg").expect(403);
  });
  test("Get gallery1/orphanphoto.jpg", async () => {
    await api.get("/api/gallery-photos/gallery1/orphanphoto.jpg").expect(403);
  });
  test("Get gallery2/orphanphoto.jpg", async () => {
    await api.get("/api/gallery-photos/gallery2/orphanphoto.jpg").expect(403);
  });

  test("Get gallery1/invalid.jpg", async () => {
    await api.get("/api/gallery-photos/gallery1/orphanphoto.jpg").expect(403);
  });
  test("Get invalid/orphanphoto.jpg", async () => {
    await api.get("/api/gallery-photos/gallery2/orphanphoto.jpg").expect(403);
  });
});

describe("As admin", () => {
  let token = undefined;
  beforeEach(async () => {
    token = await loginUser(api, "admin");
  });

  test("Get gallery1/gallery1photo.jpg", async () => {
    const result = await getGalleryPhoto(
      token,
      "gallery1",
      "gallery1photo.jpg"
    );
    expect(result.body.id).toBeDefined();
    expect(result.body.id).toBe("gallery1photo.jpg");
  });
  test("Get gallery2/gallery1photo.jpg", async () => {
    await getGalleryPhoto(token, "gallery2", "gallery1photo.jpg", 404);
  });
  test("Get gallery1/gallery12photo.jpg", async () => {
    const result = await getGalleryPhoto(
      token,
      "gallery1",
      "gallery12photo.jpg"
    );
    expect(result.body.id).toBeDefined();
    expect(result.body.id).toBe("gallery12photo.jpg");
  });
  test("Get gallery2/gallery12photo.jpg", async () => {
    const result = await getGalleryPhoto(
      token,
      "gallery2",
      "gallery12photo.jpg"
    );
    expect(result.body.id).toBeDefined();
    expect(result.body.id).toBe("gallery12photo.jpg");
  });
  test("Get gallery1/gallery2photo.jpg", async () => {
    getGalleryPhoto(token, "gallery1", "gallery2photo.jpg", 404);
  });
  test("Get gallery2/gallery2photo.jpg", async () => {
    const result = await getGalleryPhoto(
      token,
      "gallery2",
      "gallery2photo.jpg"
    );
    expect(result.body.id).toBeDefined();
    expect(result.body.id).toBe("gallery2photo.jpg");
  });
  test("Get gallery1/orphanphoto.jpg", async () => {
    await getGalleryPhoto(token, "gallery1", "orphanphoto.jpg", 404);
  });
  test("Get gallery2/orphanphoto.jpg", async () => {
    await getGalleryPhoto(token, "gallery2", "orphanphoto.jpg", 404);
  });

  test("Get gallery1/invalid.jpg", async () => {
    await getGalleryPhoto(token, "gallery1", "invalid.jpg", 404);
  });
  test("Get invalid/orphanphoto.jpg", async () => {
    await getGalleryPhoto(token, "invalid", "orphanphoto.jpg", 404);
  });
});

describe("As gallery1Admin", () => {
  let token = undefined;
  beforeEach(async () => {
    token = await loginUser(api, "gallery1Admin");
  });

  test("Get gallery1/gallery1photo.jpg", async () => {
    const result = await getGalleryPhoto(
      token,
      "gallery1",
      "gallery1photo.jpg"
    );
    expect(result.body.id).toBeDefined();
    expect(result.body.id).toBe("gallery1photo.jpg");
  });
  test("Get gallery2/gallery1photo.jpg", async () => {
    await getGalleryPhoto(token, "gallery2", "gallery1photo.jpg", 404);
  });
  test("Get gallery1/gallery12photo.jpg", async () => {
    const result = await getGalleryPhoto(
      token,
      "gallery1",
      "gallery12photo.jpg"
    );
    expect(result.body.id).toBeDefined();
    expect(result.body.id).toBe("gallery12photo.jpg");
  });
  test("Get gallery2/gallery12photo.jpg", async () => {
    const result = await getGalleryPhoto(
      token,
      "gallery2",
      "gallery12photo.jpg"
    );
    expect(result.body.id).toBeDefined();
    expect(result.body.id).toBe("gallery12photo.jpg");
  });
  test("Get gallery1/gallery2photo.jpg", async () => {
    await getGalleryPhoto(token, "gallery1", "gallery2photo.jpg", 404);
  });
  test("Get gallery2/gallery2photo.jpg", async () => {
    const result = await getGalleryPhoto(
      token,
      "gallery2",
      "gallery2photo.jpg"
    );
    expect(result.body.id).toBeDefined();
    expect(result.body.id).toBe("gallery2photo.jpg");
  });
  test("Get gallery1/orphanphoto.jpg", async () => {
    await getGalleryPhoto(token, "gallery1", "orphanphoto.jpg", 404);
  });
  test("Get gallery2/orphanphoto.jpg", async () => {
    await getGalleryPhoto(token, "gallery2", "orphanphoto.jpg", 404);
  });

  test("Get gallery1/invalid.jpg", async () => {
    await getGalleryPhoto(token, "gallery1", "invalid.jpg", 404);
  });
  test("Get invalid/orphanphoto.jpg", async () => {
    await getGalleryPhoto(token, "invalid", "orphanphoto.jpg", 404);
  });
});

describe("As gallery2Admin", () => {
  let token = undefined;
  beforeEach(async () => {
    token = await loginUser(api, "gallery2Admin");
  });

  test("Get gallery1/gallery1photo.jpg", async () => {
    await getGalleryPhoto(token, "gallery1", "gallery1photo.jpg", 403);
  });
  test("Get gallery2/gallery1photo.jpg", async () => {
    await getGalleryPhoto(token, "gallery2", "gallery1photo.jpg", 404);
  });
  test("Get gallery1/gallery12photo.jpg", async () => {
    await getGalleryPhoto(token, "gallery1", "gallery12photo.jpg", 403);
  });
  test("Get gallery2/gallery12photo.jpg", async () => {
    const result = await getGalleryPhoto(
      token,
      "gallery2",
      "gallery12photo.jpg"
    );
    expect(result.body.id).toBeDefined();
    expect(result.body.id).toBe("gallery12photo.jpg");
  });
  test("Get gallery1/gallery2photo.jpg", async () => {
    await getGalleryPhoto(token, "gallery1", "gallery2photo.jpg", 403);
  });
  test("Get gallery2/gallery2photo.jpg", async () => {
    const result = await getGalleryPhoto(
      token,
      "gallery2",
      "gallery2photo.jpg"
    );
    expect(result.body.id).toBeDefined();
    expect(result.body.id).toBe("gallery2photo.jpg");
  });
  test("Get gallery1/orphanphoto.jpg", async () => {
    await getGalleryPhoto(token, "gallery1", "orphanphoto.jpg", 403);
  });
  test("Get gallery2/orphanphoto.jpg", async () => {
    await getGalleryPhoto(token, "gallery2", "orphanphoto.jpg", 404);
  });

  test("Get gallery1/invalid.jpg", async () => {
    await getGalleryPhoto(token, "gallery1", "invalid.jpg", 403);
  });
  test("Get invalid/orphanphoto.jpg", async () => {
    await getGalleryPhoto(token, "invalid", "orphanphoto.jpg", 403);
  });
});

describe("As plainUser", () => {
  let token = undefined;
  beforeEach(async () => {
    token = await loginUser(api, "plainUser");
  });

  test("Get gallery1/gallery1photo.jpg", async () => {
    const result = await getGalleryPhoto(
      token,
      "gallery1",
      "gallery1photo.jpg"
    );
    expect(result.body.id).toBeDefined();
    expect(result.body.id).toBe("gallery1photo.jpg");
  });
  test("Get gallery2/gallery1photo.jpg", async () => {
    await getGalleryPhoto(token, "gallery2", "gallery1photo.jpg", 404);
  });
  test("Get gallery1/gallery12photo.jpg", async () => {
    const result = await getGalleryPhoto(
      token,
      "gallery1",
      "gallery12photo.jpg"
    );
    expect(result.body.id).toBeDefined();
    expect(result.body.id).toBe("gallery12photo.jpg");
  });
  test("Get gallery2/gallery12photo.jpg", async () => {
    const result = await getGalleryPhoto(
      token,
      "gallery2",
      "gallery12photo.jpg"
    );
    expect(result.body.id).toBeDefined();
    expect(result.body.id).toBe("gallery12photo.jpg");
  });
  test("Get gallery1/gallery2photo.jpg", async () => {
    await getGalleryPhoto(token, "gallery1", "gallery2photo.jpg", 404);
  });
  test("Get gallery2/gallery2photo.jpg", async () => {
    const result = await getGalleryPhoto(
      token,
      "gallery2",
      "gallery2photo.jpg"
    );
    expect(result.body.id).toBeDefined();
    expect(result.body.id).toBe("gallery2photo.jpg");
  });
  test("Get gallery1/orphanphoto.jpg", async () => {
    await getGalleryPhoto(token, "gallery1", "orphanphoto.jpg", 404);
  });
  test("Get gallery2/orphanphoto.jpg", async () => {
    await getGalleryPhoto(token, "gallery2", "orphanphoto.jpg", 404);
  });

  test("Get gallery1/invalid.jpg", async () => {
    await getGalleryPhoto(token, "gallery1", "invalid.jpg", 404);
  });
  test("Get invalid/orphanphoto.jpg", async () => {
    await getGalleryPhoto(token, "invalid", "orphanphoto.jpg", 404);
  });
});

describe("As gallery1User", () => {
  let token = undefined;
  beforeEach(async () => {
    token = await loginUser(api, "gallery1User");
  });

  test("Get gallery1/gallery1photo.jpg", async () => {
    const result = await getGalleryPhoto(
      token,
      "gallery1",
      "gallery1photo.jpg"
    );
    expect(result.body.id).toBeDefined();
    expect(result.body.id).toBe("gallery1photo.jpg");
  });
  test("Get gallery2/gallery1photo.jpg", async () => {
    await getGalleryPhoto(token, "gallery2", "gallery1photo.jpg", 403);
  });
  test("Get gallery1/gallery12photo.jpg", async () => {
    const result = await getGalleryPhoto(
      token,
      "gallery1",
      "gallery12photo.jpg"
    );
    expect(result.body.id).toBeDefined();
    expect(result.body.id).toBe("gallery12photo.jpg");
  });
  test("Get gallery2/gallery12photo.jpg", async () => {
    await getGalleryPhoto(token, "gallery2", "gallery12photo.jpg", 403);
  });
  test("Get gallery1/gallery2photo.jpg", async () => {
    await getGalleryPhoto(token, "gallery1", "gallery2photo.jpg", 404);
  });
  test("Get gallery2/gallery2photo.jpg", async () => {
    await getGalleryPhoto(token, "gallery2", "gallery2photo.jpg", 403);
  });
  test("Get gallery1/orphanphoto.jpg", async () => {
    await getGalleryPhoto(token, "gallery1", "orphanphoto.jpg", 404);
  });
  test("Get gallery2/orphanphoto.jpg", async () => {
    await getGalleryPhoto(token, "gallery2", "orphanphoto.jpg", 403);
  });

  test("Get gallery1/invalid.jpg", async () => {
    await getGalleryPhoto(token, "gallery1", "invalid.jpg", 404);
  });
  test("Get invalid/orphanphoto.jpg", async () => {
    await getGalleryPhoto(token, "invalid", "orphanphoto.jpg", 403);
  });
});

describe("As gallery12User", () => {
  let token = undefined;
  beforeEach(async () => {
    token = await loginUser(api, "gallery12User");
  });

  test("Get gallery1/gallery1photo.jpg", async () => {
    const result = await getGalleryPhoto(
      token,
      "gallery1",
      "gallery1photo.jpg"
    );
    expect(result.body.id).toBeDefined();
    expect(result.body.id).toBe("gallery1photo.jpg");
  });
  test("Get gallery2/gallery1photo.jpg", async () => {
    await getGalleryPhoto(token, "gallery2", "gallery1photo.jpg", 404);
  });
  test("Get gallery1/gallery12photo.jpg", async () => {
    const result = await getGalleryPhoto(
      token,
      "gallery1",
      "gallery12photo.jpg"
    );
    expect(result.body.id).toBeDefined();
    expect(result.body.id).toBe("gallery12photo.jpg");
  });
  test("Get gallery2/gallery12photo.jpg", async () => {
    const result = await getGalleryPhoto(
      token,
      "gallery2",
      "gallery12photo.jpg"
    );
    expect(result.body.id).toBeDefined();
    expect(result.body.id).toBe("gallery12photo.jpg");
  });
  test("Get gallery1/gallery2photo.jpg", async () => {
    await getGalleryPhoto(token, "gallery1", "gallery2photo.jpg", 404);
  });
  test("Get gallery2/gallery2photo.jpg", async () => {
    const result = await getGalleryPhoto(
      token,
      "gallery2",
      "gallery2photo.jpg"
    );
    expect(result.body.id).toBeDefined();
    expect(result.body.id).toBe("gallery2photo.jpg");
  });
  test("Get gallery1/orphanphoto.jpg", async () => {
    await getGalleryPhoto(token, "gallery1", "orphanphoto.jpg", 404);
  });
  test("Get gallery2/orphanphoto.jpg", async () => {
    await getGalleryPhoto(token, "gallery2", "orphanphoto.jpg", 404);
  });

  test("Get gallery1/invalid.jpg", async () => {
    await getGalleryPhoto(token, "gallery1", "invalid.jpg", 404);
  });
  test("Get invalid/orphanphoto.jpg", async () => {
    await getGalleryPhoto(token, "invalid", "orphanphoto.jpg", 403);
  });
});

afterAll(() => {});
