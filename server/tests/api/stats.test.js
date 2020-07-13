"use strict";

const supertest = require("supertest");
const app = require("../../app");

const api = supertest(app);
const db = require("../../db/dummy")();
const { loginUser } = require("./helper");

beforeEach(async () => {
  db.init();
});

const getStats = async (token, status = 200) =>
  api
    .get("/api/stats")
    .set("Cookie", [`token=${token}`])
    .expect(status);

const getGalleryStats = async (token, galleryId, status = 200) =>
  api
    .get(`/api/stats/${galleryId}`)
    .set("Cookie", [`token=${token}`])
    .expect(status);

describe("As Guest", () => {
  test("Get stats", async () => {
    await api.get("/api/stats").expect(403);
  });
  test("Get gallery1 stats", async () => {
    await api.get("/api/galleries/gallery1").expect(403);
  });
  test("Get gallery2 stats", async () => {
    await api.get("/api/galleries/gallery2").expect(403);
  });
  test("Get :all stats", async () => {
    await api.get("/api/galleries/:all").expect(403);
  });
  test("Get :none stats", async () => {
    await api.get("/api/galleries/:none").expect(403);
  });
});

describe("As admin", () => {
  let token = undefined;
  beforeEach(async () => {
    token = await loginUser(api, "admin");
  });

  test("Get stats", async () => {
    await getStats(token);
  });
  test("Get gallery1 stats", async () => {
    await getGalleryStats(token, "gallery1");
  });
  test("Get gallery2 stats", async () => {
    await getGalleryStats(token, "gallery2");
  });
  test("Get :all stats", async () => {
    await getGalleryStats(token, ":all");
  });
  test("Get :none stats", async () => {
    await getGalleryStats(token, ":none");
  });
});

describe("As gallery1Admin", () => {
  let token = undefined;
  beforeEach(async () => {
    token = await loginUser(api, "gallery1Admin");
  });

  test("Get stats", async () => {
    await getStats(token);
  });
  test("Get gallery1 stats", async () => {
    await getGalleryStats(token, "gallery1");
  });
  test("Get gallery2 stats", async () => {
    await getGalleryStats(token, "gallery2");
  });
  test("Get :all stats", async () => {
    await getGalleryStats(token, ":all");
  });
  test("Get :none stats", async () => {
    await getGalleryStats(token, ":none");
  });
});

describe("As gallery2Admin", () => {
  let token = undefined;
  beforeEach(async () => {
    token = await loginUser(api, "gallery2Admin");
  });

  test("Get stats", async () => {
    await getStats(token, 403);
  });
  test("Get gallery1 stats", async () => {
    await getGalleryStats(token, "gallery1", 403);
  });
  test("Get gallery2 stats", async () => {
    await getGalleryStats(token, "gallery2");
  });
  test("Get :all stats", async () => {
    await getGalleryStats(token, ":all", 403);
  });
  test("Get :none stats", async () => {
    await getGalleryStats(token, ":none", 403);
  });
});

describe("As plainUser", () => {
  let token = undefined;
  beforeEach(async () => {
    token = await loginUser(api, "plainUser");
  });

  test("Get stats", async () => {
    await getStats(token);
  });
  test("Get gallery1 stats", async () => {
    await getGalleryStats(token, "gallery1");
  });
  test("Get gallery2 stats", async () => {
    await getGalleryStats(token, "gallery2");
  });
  test("Get :all stats", async () => {
    await getGalleryStats(token, ":all");
  });
  test("Get :none stats", async () => {
    await getGalleryStats(token, ":none");
  });
});
describe("As gallery1User", () => {
  let token = undefined;
  beforeEach(async () => {
    token = await loginUser(api, "gallery1User");
  });

  test("Get stats", async () => {
    await getStats(token, 403);
  });
  test("Get gallery1 stats", async () => {
    await getGalleryStats(token, "gallery1");
  });
  test("Get gallery2 stats", async () => {
    await getGalleryStats(token, "gallery2", 403);
  });
  test("Get :all stats", async () => {
    await getGalleryStats(token, ":all", 403);
  });
  test("Get :none stats", async () => {
    await getGalleryStats(token, ":none", 403);
  });
});
describe("As gallery12User", () => {
  let token = undefined;
  beforeEach(async () => {
    token = await loginUser(api, "gallery12User");
  });

  test("Get stats", async () => {
    await getStats(token, 403);
  });
  test("Get gallery1 stats", async () => {
    await getGalleryStats(token, "gallery1");
  });
  test("Get gallery2 stats", async () => {
    await getGalleryStats(token, "gallery2");
  });
  test("Get :all stats", async () => {
    await getGalleryStats(token, ":all", 403);
  });
  test("Get :none stats", async () => {
    await getGalleryStats(token, ":none", 403);
  });
});

afterAll(() => {});
