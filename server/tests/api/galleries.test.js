"use strict";

const supertest = require("supertest");
const app = require("../../app");

const api = supertest(app);
const db = require("../../db/dummy")();
const { loginUser } = require("./helper");

beforeEach(async () => {
  db.init();
});

const getGalleries = async (token, status = 200) =>
  api
    .get("/api/galleries")
    .set("Cookie", [`token=${token}`])
    .expect(status);

const getGallery = async (token, galleryId, status = 200) =>
  api
    .get(`/api/galleries/${galleryId}`)
    .set("Cookie", [`token=${token}`])
    .expect(status);

describe("As Guest", () => {
  test("List galleries", async () => {
    const result = await api
      .get("/api/galleries")
      .expect(200)
      .expect("Content-Type", /application\/json/);
    expect(result.body).toEqual([]);
  });
  test("Get gallery", async () => {
    await api.get("/api/galleries/gallery1").expect(403);
  });
});

describe("As admin", () => {
  let token = undefined;
  beforeEach(async () => {
    token = await loginUser(api, "admin");
  });

  test("List galleries", async () => {
    const result = await getGalleries(token);
    expect(result.body.length).toBe(4);
    // console.log(result.body);
  });

  test("Get gallery1", async () => {
    const result = await getGallery(token, "gallery1");
    // console.log(result.body);
    expect(result.body.id).toBe("gallery1");
  });
});

describe("As gallery1Admin", () => {
  let token = undefined;
  beforeEach(async () => {
    token = await loginUser(api, "gallery1Admin");
  });

  test("List galleries", async () => {
    const result = await getGalleries(token);
    expect(result.body.length).toBe(4);
  });
});

describe("As gallery2Admin", () => {
  let token = undefined;
  beforeEach(async () => {
    token = await loginUser(api, "gallery2Admin");
  });

  test("List galleries", async () => {
    const result = await getGalleries(token);
    expect(result.body.length).toBe(1);
  });
});

describe("As plainUser", () => {
  let token = undefined;
  beforeEach(async () => {
    token = await loginUser(api, "plainUser");
  });

  test("List galleries", async () => {
    const result = await getGalleries(token);
    expect(result.body.length).toBe(4);
  });
});

describe("As gallery1User", () => {
  let token = undefined;
  beforeEach(async () => {
    token = await loginUser(api, "gallery1User");
  });

  test("List galleries", async () => {
    const result = await getGalleries(token);
    expect(result.body.length).toBe(1);
  });
});

describe("As gallery12User", () => {
  let token = undefined;
  beforeEach(async () => {
    token = await loginUser(api, "gallery12User");
  });

  test("List galleries", async () => {
    const result = await getGalleries(token);
    expect(result.body.length).toBe(2);
  });
});

afterAll(() => {});
