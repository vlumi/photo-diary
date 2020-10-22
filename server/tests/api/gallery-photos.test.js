import supertest from "supertest";
import { app, init } from "../../app.js";

import dummyDb from "../../db/dummy.cjs";
import { loginUser } from "./helper.js";

const api = supertest(app);
const db = dummyDb();

beforeEach(async () => {
  await db.init();
  await init();
});

const getGalleryPhoto = async (token, galleryId, photoId, status = 200) =>
  api
    .get(`/api/gallery-photos/${galleryId}/${photoId}`)
    .set("Authorization", `Bearer ${token}`)
    .expect(status);

describe("As guest", () => {
  describe("Gallery 1", () => {
    test("Get gallery1photo.jpg", async () => {
      await api
        .get("/api/gallery-photos/gallery1/gallery1photo.jpg")
        .expect(403);
    });
    test("Get gallery12photo.jpg", async () => {
      await api
        .get("/api/gallery-photos/gallery1/gallery12photo.jpg")
        .expect(403);
    });
    test("Get gallery2photo.jpg", async () => {
      await api
        .get("/api/gallery-photos/gallery1/gallery2photo.jpg")
        .expect(403);
    });
    test("Get orphanphoto.jpg", async () => {
      await api.get("/api/gallery-photos/gallery1/orphanphoto.jpg").expect(403);
    });
    test("Get invalid.jpg", async () => {
      await api.get("/api/gallery-photos/gallery1/orphanphoto.jpg").expect(403);
    });
  });
  describe("Gallery 2", () => {
    test("Get gallery1photo.jpg", async () => {
      await api
        .get("/api/gallery-photos/gallery2/gallery1photo.jpg")
        .expect(403);
    });
    test("Get gallery12photo.jpg", async () => {
      await api
        .get("/api/gallery-photos/gallery2/gallery12photo.jpg")
        .expect(403);
    });
    test("Get gallery2photo.jpg", async () => {
      await api
        .get("/api/gallery-photos/gallery2/gallery2photo.jpg")
        .expect(403);
    });
    test("Get orphanphoto.jpg", async () => {
      await api.get("/api/gallery-photos/gallery2/orphanphoto.jpg").expect(403);
    });
  });
  describe("Gallery :all", () => {
    test("Get gallery1photo.jpg", async () => {
      await api.get("/api/gallery-photos/:all/gallery1photo.jpg").expect(403);
    });
    test("Get gallery12photo.jpg", async () => {
      await api.get("/api/gallery-photos/:all/gallery12photo.jpg").expect(403);
    });
    test("Get gallery2photo.jpg", async () => {
      await api.get("/api/gallery-photos/:all/gallery2photo.jpg").expect(403);
    });
    test("Get orphanphoto.jpg", async () => {
      await api.get("/api/gallery-photos/:all/orphanphoto.jpg").expect(403);
    });
    test("Get invalid.jpg", async () => {
      await api.get("/api/gallery-photos/:all/orphanphoto.jpg").expect(403);
    });
  });
  describe("Gallery :public", () => {
    test("Get gallery1photo.jpg", async () => {
      await api
        .get("/api/gallery-photos/:public/gallery1photo.jpg")
        .expect(403);
    });
    test("Get gallery12photo.jpg", async () => {
      await api
        .get("/api/gallery-photos/:public/gallery12photo.jpg")
        .expect(403);
    });
    test("Get gallery2photo.jpg", async () => {
      await api
        .get("/api/gallery-photos/:public/gallery2photo.jpg")
        .expect(403);
    });
    test("Get orphanphoto.jpg", async () => {
      await api.get("/api/gallery-photos/:public/orphanphoto.jpg").expect(403);
    });
    test("Get invalid.jpg", async () => {
      await api.get("/api/gallery-photos/:public/orphanphoto.jpg").expect(403);
    });
  });
  describe("Gallery :private", () => {
    test("Get gallery1photo.jpg", async () => {
      await api
        .get("/api/gallery-photos/:private/gallery1photo.jpg")
        .expect(403);
    });
    test("Get orphanphoto.jpg", async () => {
      await api.get("/api/gallery-photos/:private/orphanphoto.jpg").expect(403);
    });
    test("Get invalid.jpg", async () => {
      await api.get("/api/gallery-photos/:private/orphanphoto.jpg").expect(403);
    });
  });
  describe("Invalid gallery", () => {
    test("Get orphanphoto.jpg", async () => {
      await api.get("/api/gallery-photos/gallery2/orphanphoto.jpg").expect(403);
    });
  });
});

describe("As admin", () => {
  let token = undefined;
  beforeAll(async () => {
    token = await loginUser(api, "admin");
  });

  describe("Gallery 1", () => {
    test("Get gallery1photo.jpg", async () => {
      const result = await getGalleryPhoto(
        token,
        "gallery1",
        "gallery1photo.jpg"
      );
      expect(result.body.id).toBeDefined();
      expect(result.body.id).toBe("gallery1photo.jpg");
    });
    test("Get gallery12photo.jpg", async () => {
      const result = await getGalleryPhoto(
        token,
        "gallery1",
        "gallery12photo.jpg"
      );
      expect(result.body.id).toBeDefined();
      expect(result.body.id).toBe("gallery12photo.jpg");
    });
    test("Get gallery2photo.jpg", async () => {
      getGalleryPhoto(token, "gallery1", "gallery2photo.jpg", 404);
    });
    test("Get orphanphoto.jpg", async () => {
      await getGalleryPhoto(token, "gallery1", "orphanphoto.jpg", 404);
    });
    test("Get invalid.jpg", async () => {
      await getGalleryPhoto(token, "gallery1", "invalid.jpg", 404);
    });
  });
  describe("Gallery 2", () => {
    test("Get gallery2/gallery1photo.jpg", async () => {
      await getGalleryPhoto(token, "gallery2", "gallery1photo.jpg", 404);
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
    test("Get gallery2/gallery2photo.jpg", async () => {
      const result = await getGalleryPhoto(
        token,
        "gallery2",
        "gallery2photo.jpg"
      );
      expect(result.body.id).toBeDefined();
      expect(result.body.id).toBe("gallery2photo.jpg");
    });
    test("Get gallery2/orphanphoto.jpg", async () => {
      await getGalleryPhoto(token, "gallery2", "orphanphoto.jpg", 404);
    });
  });
  describe("Gallery :all", () => {
    test("Get gallery1photo.jpg", async () => {
      const result = await getGalleryPhoto(token, ":all", "gallery1photo.jpg");
      expect(result.body.id).toBeDefined();
      expect(result.body.id).toBe("gallery1photo.jpg");
    });
    test("Get gallery12photo.jpg", async () => {
      const result = await getGalleryPhoto(token, ":all", "gallery12photo.jpg");
      expect(result.body.id).toBeDefined();
      expect(result.body.id).toBe("gallery12photo.jpg");
    });
    test("Get gallery2photo.jpg", async () => {
      const result = await getGalleryPhoto(token, ":all", "gallery2photo.jpg");
      expect(result.body.id).toBeDefined();
      expect(result.body.id).toBe("gallery2photo.jpg");
    });
    test("Get orphanphoto.jpg", async () => {
      const result = await getGalleryPhoto(token, ":all", "orphanphoto.jpg");
      expect(result.body.id).toBeDefined();
      expect(result.body.id).toBe("orphanphoto.jpg");
    });
    test("Get invalid.jpg", async () => {
      await getGalleryPhoto(token, ":all", "invalid.jpg", 404);
    });
  });
  describe("Gallery :public", () => {
    test("Get gallery1photo.jpg", async () => {
      const result = await getGalleryPhoto(
        token,
        ":public",
        "gallery1photo.jpg"
      );
      expect(result.body.id).toBeDefined();
      expect(result.body.id).toBe("gallery1photo.jpg");
    });
    test("Get gallery12photo.jpg", async () => {
      const result = await getGalleryPhoto(
        token,
        ":public",
        "gallery12photo.jpg"
      );
      expect(result.body.id).toBeDefined();
      expect(result.body.id).toBe("gallery12photo.jpg");
    });
    test("Get gallery2photo.jpg", async () => {
      const result = await getGalleryPhoto(
        token,
        ":public",
        "gallery2photo.jpg"
      );
      expect(result.body.id).toBeDefined();
      expect(result.body.id).toBe("gallery2photo.jpg");
    });
    test("Get orphanphoto.jpg", async () => {
      await getGalleryPhoto(token, ":public", "orphanphoto.jpg", 404);
    });
    test("Get invalid.jpg", async () => {
      await getGalleryPhoto(token, ":public", "invalid.jpg", 404);
    });
  });
  describe("Gallery :private", () => {
    test("Get gallery1photo.jpg", async () => {
      getGalleryPhoto(token, ":private", "gallery2photo.jpg", 404);
    });
    test("Get orphanphoto.jpg", async () => {
      const result = await getGalleryPhoto(
        token,
        ":private",
        "orphanphoto.jpg"
      );
      expect(result.body.id).toBeDefined();
      expect(result.body.id).toBe("orphanphoto.jpg");
    });
    test("Get invalid.jpg", async () => {
      await getGalleryPhoto(token, ":private", "invalid.jpg", 404);
    });
  });
  describe("Invalid gallery", () => {
    test("Get orphanphoto.jpg", async () => {
      await getGalleryPhoto(token, "invalid", "orphanphoto.jpg", 404);
    });
  });
});

describe("As gallery1Admin", () => {
  let token = undefined;
  beforeAll(async () => {
    token = await loginUser(api, "gallery1Admin");
  });

  describe("Gallery 1", () => {
    test("Get gallery1photo.jpg", async () => {
      const result = await getGalleryPhoto(
        token,
        "gallery1",
        "gallery1photo.jpg"
      );
      expect(result.body.id).toBeDefined();
      expect(result.body.id).toBe("gallery1photo.jpg");
    });
    test("Get gallery12photo.jpg", async () => {
      const result = await getGalleryPhoto(
        token,
        "gallery1",
        "gallery12photo.jpg"
      );
      expect(result.body.id).toBeDefined();
      expect(result.body.id).toBe("gallery12photo.jpg");
    });
    test("Get gallery2photo.jpg", async () => {
      await getGalleryPhoto(token, "gallery1", "gallery2photo.jpg", 404);
    });
    test("Get orphanphoto.jpg", async () => {
      await getGalleryPhoto(token, "gallery1", "orphanphoto.jpg", 404);
    });
    test("Get invalid.jpg", async () => {
      await getGalleryPhoto(token, "gallery1", "invalid.jpg", 404);
    });
  });
  describe("Gallery 2", () => {
    test("Get gallery1photo.jpg", async () => {
      await getGalleryPhoto(token, "gallery2", "gallery1photo.jpg", 404);
    });
    test("Get gallery12photo.jpg", async () => {
      const result = await getGalleryPhoto(
        token,
        "gallery2",
        "gallery12photo.jpg"
      );
      expect(result.body.id).toBeDefined();
      expect(result.body.id).toBe("gallery12photo.jpg");
    });
    test("Get gallery2photo.jpg", async () => {
      const result = await getGalleryPhoto(
        token,
        "gallery2",
        "gallery2photo.jpg"
      );
      expect(result.body.id).toBeDefined();
      expect(result.body.id).toBe("gallery2photo.jpg");
    });
    test("Get orphanphoto.jpg", async () => {
      await getGalleryPhoto(token, "gallery2", "orphanphoto.jpg", 404);
    });
  });
  describe("Gallery :all", () => {
    test("Get gallery1photo.jpg", async () => {
      const result = await getGalleryPhoto(token, ":all", "gallery1photo.jpg");
      expect(result.body.id).toBeDefined();
      expect(result.body.id).toBe("gallery1photo.jpg");
    });
    test("Get gallery12photo.jpg", async () => {
      const result = await getGalleryPhoto(token, ":all", "gallery12photo.jpg");
      expect(result.body.id).toBeDefined();
      expect(result.body.id).toBe("gallery12photo.jpg");
    });
    test("Get gallery2photo.jpg", async () => {
      const result = await getGalleryPhoto(token, ":all", "gallery2photo.jpg");
      expect(result.body.id).toBeDefined();
      expect(result.body.id).toBe("gallery2photo.jpg");
    });
    test("Get orphanphoto.jpg", async () => {
      const result = await getGalleryPhoto(token, ":all", "orphanphoto.jpg");
      expect(result.body.id).toBeDefined();
      expect(result.body.id).toBe("orphanphoto.jpg");
    });
    test("Get invalid.jpg", async () => {
      await getGalleryPhoto(token, ":all", "invalid.jpg", 404);
    });
  });
  describe("Gallery :public", () => {
    test("Get gallery1photo.jpg", async () => {
      const result = await getGalleryPhoto(
        token,
        ":public",
        "gallery1photo.jpg"
      );
      expect(result.body.id).toBeDefined();
      expect(result.body.id).toBe("gallery1photo.jpg");
    });
    test("Get gallery12photo.jpg", async () => {
      const result = await getGalleryPhoto(
        token,
        ":public",
        "gallery12photo.jpg"
      );
      expect(result.body.id).toBeDefined();
      expect(result.body.id).toBe("gallery12photo.jpg");
    });
    test("Get gallery2photo.jpg", async () => {
      const result = await getGalleryPhoto(
        token,
        ":public",
        "gallery2photo.jpg"
      );
      expect(result.body.id).toBeDefined();
      expect(result.body.id).toBe("gallery2photo.jpg");
    });
    test("Get orphanphoto.jpg", async () => {
      await getGalleryPhoto(token, ":public", "orphanphoto.jpg", 404);
    });
    test("Get invalid.jpg", async () => {
      await getGalleryPhoto(token, ":public", "invalid.jpg", 404);
    });
  });
  describe("Gallery :private", () => {
    test("Get gallery1photo.jpg", async () => {
      getGalleryPhoto(token, ":private", "gallery2photo.jpg", 404);
    });
    test("Get orphanphoto.jpg", async () => {
      const result = await getGalleryPhoto(
        token,
        ":private",
        "orphanphoto.jpg"
      );
      expect(result.body.id).toBeDefined();
      expect(result.body.id).toBe("orphanphoto.jpg");
    });
    test("Get invalid.jpg", async () => {
      await getGalleryPhoto(token, ":private", "invalid.jpg", 404);
    });
  });
  describe("Invalid gallery", () => {
    test("Get orphanphoto.jpg", async () => {
      await getGalleryPhoto(token, "invalid", "orphanphoto.jpg", 404);
    });
  });
});

describe("As gallery2Admin", () => {
  let token = undefined;
  beforeAll(async () => {
    token = await loginUser(api, "gallery2Admin");
  });

  describe("Gallery 1", () => {
    test("Get gallery1photo.jpg", async () => {
      await getGalleryPhoto(token, "gallery1", "gallery1photo.jpg", 403);
    });
    test("Get gallery12photo.jpg", async () => {
      await getGalleryPhoto(token, "gallery1", "gallery12photo.jpg", 403);
    });
    test("Get gallery2photo.jpg", async () => {
      await getGalleryPhoto(token, "gallery1", "gallery2photo.jpg", 403);
    });
    test("Get orphanphoto.jpg", async () => {
      await getGalleryPhoto(token, "gallery1", "orphanphoto.jpg", 403);
    });
    test("Get invalid.jpg", async () => {
      await getGalleryPhoto(token, "gallery1", "invalid.jpg", 403);
    });
  });
  describe("Gallery 2", () => {
    test("Get gallery1photo.jpg", async () => {
      await getGalleryPhoto(token, "gallery2", "gallery1photo.jpg", 404);
    });
    test("Get gallery12photo.jpg", async () => {
      const result = await getGalleryPhoto(
        token,
        "gallery2",
        "gallery12photo.jpg"
      );
      expect(result.body.id).toBeDefined();
      expect(result.body.id).toBe("gallery12photo.jpg");
    });
    test("Get gallery2photo.jpg", async () => {
      const result = await getGalleryPhoto(
        token,
        "gallery2",
        "gallery2photo.jpg"
      );
      expect(result.body.id).toBeDefined();
      expect(result.body.id).toBe("gallery2photo.jpg");
    });
    test("Get orphanphoto.jpg", async () => {
      await getGalleryPhoto(token, "gallery2", "orphanphoto.jpg", 404);
    });
  });
  describe("Gallery :all", () => {
    test("Get gallery1photo.jpg", async () => {
      await getGalleryPhoto(token, ":all", "gallery1photo.jpg", 403);
    });
    test("Get gallery12photo.jpg", async () => {
      await getGalleryPhoto(token, ":all", "gallery12photo.jpg", 403);
    });
    test("Get gallery2photo.jpg", async () => {
      await getGalleryPhoto(token, ":all", "gallery2photo.jpg", 403);
    });
    test("Get orphanphoto.jpg", async () => {
      await getGalleryPhoto(token, ":all", "orphanphoto.jpg", 403);
    });
    test("Get invalid.jpg", async () => {
      await getGalleryPhoto(token, ":all", "invalid.jpg", 403);
    });
  });
  describe("Gallery :public", () => {
    test("Get gallery1photo.jpg", async () => {
      await getGalleryPhoto(token, ":public", "gallery1photo.jpg", 403);
    });
    test("Get gallery12photo.jpg", async () => {
      await getGalleryPhoto(token, ":public", "gallery12photo.jpg", 403);
    });
    test("Get gallery2photo.jpg", async () => {
      await getGalleryPhoto(token, ":public", "gallery2photo.jpg", 403);
    });
    test("Get orphanphoto.jpg", async () => {
      await getGalleryPhoto(token, ":public", "orphanphoto.jpg", 403);
    });
    test("Get invalid.jpg", async () => {
      await getGalleryPhoto(token, ":public", "invalid.jpg", 403);
    });
  });
  describe("Gallery :private", () => {
    test("Get gallery1photo.jpg", async () => {
      await getGalleryPhoto(token, ":private", "gallery1photo.jpg", 403);
    });
    test("Get orphanphoto.jpg", async () => {
      await getGalleryPhoto(token, ":private", "orphanphoto.jpg", 403);
    });
    test("Get invalid.jpg", async () => {
      await getGalleryPhoto(token, ":private", "invalid.jpg", 403);
    });
  });
  describe("Invalid gallery", () => {
    test("Get orphanphoto.jpg", async () => {
      await getGalleryPhoto(token, "invalid", "orphanphoto.jpg", 403);
    });
  });
});

describe("As plainUser", () => {
  let token = undefined;
  beforeAll(async () => {
    token = await loginUser(api, "plainUser");
  });

  describe("Gallery 1", () => {
    test("Get gallery1photo.jpg", async () => {
      const result = await getGalleryPhoto(
        token,
        "gallery1",
        "gallery1photo.jpg"
      );
      expect(result.body.id).toBeDefined();
      expect(result.body.id).toBe("gallery1photo.jpg");
    });
    test("Get gallery12photo.jpg", async () => {
      const result = await getGalleryPhoto(
        token,
        "gallery1",
        "gallery12photo.jpg"
      );
      expect(result.body.id).toBeDefined();
      expect(result.body.id).toBe("gallery12photo.jpg");
    });
    test("Get gallery2photo.jpg", async () => {
      await getGalleryPhoto(token, "gallery1", "gallery2photo.jpg", 404);
    });
    test("Get orphanphoto.jpg", async () => {
      await getGalleryPhoto(token, "gallery1", "orphanphoto.jpg", 404);
    });
    test("Get invalid.jpg", async () => {
      await getGalleryPhoto(token, "gallery1", "invalid.jpg", 404);
    });
  });
  describe("Gallery 2", () => {
    test("Get gallery1photo.jpg", async () => {
      await getGalleryPhoto(token, "gallery2", "gallery1photo.jpg", 404);
    });
    test("Get gallery12photo.jpg", async () => {
      const result = await getGalleryPhoto(
        token,
        "gallery2",
        "gallery12photo.jpg"
      );
      expect(result.body.id).toBeDefined();
      expect(result.body.id).toBe("gallery12photo.jpg");
    });
    test("Get gallery2photo.jpg", async () => {
      const result = await getGalleryPhoto(
        token,
        "gallery2",
        "gallery2photo.jpg"
      );
      expect(result.body.id).toBeDefined();
      expect(result.body.id).toBe("gallery2photo.jpg");
    });
    test("Get orphanphoto.jpg", async () => {
      await getGalleryPhoto(token, "gallery2", "orphanphoto.jpg", 404);
    });
  });
  describe("Gallery :all", () => {
    test("Get gallery1photo.jpg", async () => {
      const result = await getGalleryPhoto(token, ":all", "gallery1photo.jpg");
      expect(result.body.id).toBeDefined();
      expect(result.body.id).toBe("gallery1photo.jpg");
    });
    test("Get gallery12photo.jpg", async () => {
      const result = await getGalleryPhoto(token, ":all", "gallery12photo.jpg");
      expect(result.body.id).toBeDefined();
      expect(result.body.id).toBe("gallery12photo.jpg");
    });
    test("Get gallery2photo.jpg", async () => {
      const result = await getGalleryPhoto(token, ":all", "gallery2photo.jpg");
      expect(result.body.id).toBeDefined();
      expect(result.body.id).toBe("gallery2photo.jpg");
    });
    test("Get orphanphoto.jpg", async () => {
      const result = await getGalleryPhoto(token, ":all", "orphanphoto.jpg");
      expect(result.body.id).toBeDefined();
      expect(result.body.id).toBe("orphanphoto.jpg");
    });
    test("Get invalid.jpg", async () => {
      await getGalleryPhoto(token, ":all", "invalid.jpg", 404);
    });
  });
  describe("Gallery :public", () => {
    test("Get gallery1photo.jpg", async () => {
      const result = await getGalleryPhoto(
        token,
        ":public",
        "gallery1photo.jpg"
      );
      expect(result.body.id).toBeDefined();
      expect(result.body.id).toBe("gallery1photo.jpg");
    });
    test("Get gallery12photo.jpg", async () => {
      const result = await getGalleryPhoto(
        token,
        ":public",
        "gallery12photo.jpg"
      );
      expect(result.body.id).toBeDefined();
      expect(result.body.id).toBe("gallery12photo.jpg");
    });
    test("Get gallery2photo.jpg", async () => {
      const result = await getGalleryPhoto(
        token,
        ":public",
        "gallery2photo.jpg"
      );
      expect(result.body.id).toBeDefined();
      expect(result.body.id).toBe("gallery2photo.jpg");
    });
    test("Get orphanphoto.jpg", async () => {
      await getGalleryPhoto(token, ":public", "orphanphoto.jpg", 404);
    });
    test("Get invalid.jpg", async () => {
      await getGalleryPhoto(token, ":public", "invalid.jpg", 404);
    });
  });
  describe("Gallery :private", () => {
    test("Get gallery1photo.jpg", async () => {
      getGalleryPhoto(token, ":private", "gallery2photo.jpg", 404);
    });
    test("Get orphanphoto.jpg", async () => {
      const result = await getGalleryPhoto(
        token,
        ":private",
        "orphanphoto.jpg"
      );
      expect(result.body.id).toBeDefined();
      expect(result.body.id).toBe("orphanphoto.jpg");
    });
    test("Get invalid.jpg", async () => {
      await getGalleryPhoto(token, ":private", "invalid.jpg", 404);
    });
  });
  describe("Invalid gallery", () => {
    test("Get orphanphoto.jpg", async () => {
      await getGalleryPhoto(token, "invalid", "orphanphoto.jpg", 404);
    });
  });
});

describe("As gallery1User", () => {
  let token = undefined;
  beforeAll(async () => {
    token = await loginUser(api, "gallery1User");
  });

  describe("Gallery 1", () => {
    test("Get gallery1photo.jpg", async () => {
      const result = await getGalleryPhoto(
        token,
        "gallery1",
        "gallery1photo.jpg"
      );
      expect(result.body.id).toBeDefined();
      expect(result.body.id).toBe("gallery1photo.jpg");
    });
    test("Get gallery12photo.jpg", async () => {
      const result = await getGalleryPhoto(
        token,
        "gallery1",
        "gallery12photo.jpg"
      );
      expect(result.body.id).toBeDefined();
      expect(result.body.id).toBe("gallery12photo.jpg");
    });
    test("Get gallery2photo.jpg", async () => {
      await getGalleryPhoto(token, "gallery1", "gallery2photo.jpg", 404);
    });
    test("Get orphanphoto.jpg", async () => {
      await getGalleryPhoto(token, "gallery1", "orphanphoto.jpg", 404);
    });
    test("Get invalid.jpg", async () => {
      await getGalleryPhoto(token, "gallery1", "invalid.jpg", 404);
    });
  });
  describe("Gallery 2", () => {
    test("Get gallery1photo.jpg", async () => {
      await getGalleryPhoto(token, "gallery2", "gallery1photo.jpg", 403);
    });
    test("Get gallery12photo.jpg", async () => {
      await getGalleryPhoto(token, "gallery2", "gallery12photo.jpg", 403);
    });
    test("Get gallery2photo.jpg", async () => {
      await getGalleryPhoto(token, "gallery2", "gallery2photo.jpg", 403);
    });
    test("Get orphanphoto.jpg", async () => {
      await getGalleryPhoto(token, "gallery2", "orphanphoto.jpg", 403);
    });
  });
  describe("Gallery :all", () => {
    test("Get gallery1photo.jpg", async () => {
      await getGalleryPhoto(token, ":all", "gallery1photo.jpg", 403);
    });
    test("Get gallery12photo.jpg", async () => {
      await getGalleryPhoto(token, ":all", "gallery12photo.jpg", 403);
    });
    test("Get gallery2photo.jpg", async () => {
      await getGalleryPhoto(token, ":all", "gallery2photo.jpg", 403);
    });
    test("Get orphanphoto.jpg", async () => {
      await getGalleryPhoto(token, ":all", "orphanphoto.jpg", 403);
    });
    test("Get invalid.jpg", async () => {
      await getGalleryPhoto(token, ":all", "invalid.jpg", 403);
    });
  });
  describe("Gallery :public", () => {
    test("Get gallery1photo.jpg", async () => {
      await getGalleryPhoto(token, ":public", "gallery1photo.jpg", 403);
    });
    test("Get gallery12photo.jpg", async () => {
      await getGalleryPhoto(token, ":public", "gallery12photo.jpg", 403);
    });
    test("Get gallery2photo.jpg", async () => {
      await getGalleryPhoto(token, ":public", "gallery2photo.jpg", 403);
    });
    test("Get orphanphoto.jpg", async () => {
      await getGalleryPhoto(token, ":public", "orphanphoto.jpg", 403);
    });
    test("Get invalid.jpg", async () => {
      await getGalleryPhoto(token, ":public", "invalid.jpg", 403);
    });
  });
  describe("Gallery :private", () => {
    test("Get gallery1photo.jpg", async () => {
      await getGalleryPhoto(token, ":private", "gallery1photo.jpg", 403);
    });
    test("Get orphanphoto.jpg", async () => {
      await getGalleryPhoto(token, ":private", "orphanphoto.jpg", 403);
    });
    test("Get invalid.jpg", async () => {
      await getGalleryPhoto(token, ":private", "invalid.jpg", 403);
    });
  });
  describe("Invalid gallery", () => {
    test("Get orphanphoto.jpg", async () => {
      await getGalleryPhoto(token, "invalid", "orphanphoto.jpg", 403);
    });
  });
});

describe("As gallery12User", () => {
  let token = undefined;
  beforeAll(async () => {
    token = await loginUser(api, "gallery12User");
  });

  describe("Gallery 1", () => {
    test("Get gallery1photo.jpg", async () => {
      const result = await getGalleryPhoto(
        token,
        "gallery1",
        "gallery1photo.jpg"
      );
      expect(result.body.id).toBeDefined();
      expect(result.body.id).toBe("gallery1photo.jpg");
    });
    test("Get gallery12photo.jpg", async () => {
      const result = await getGalleryPhoto(
        token,
        "gallery1",
        "gallery12photo.jpg"
      );
      expect(result.body.id).toBeDefined();
      expect(result.body.id).toBe("gallery12photo.jpg");
    });
    test("Get gallery2photo.jpg", async () => {
      await getGalleryPhoto(token, "gallery1", "gallery2photo.jpg", 404);
    });
    test("Get orphanphoto.jpg", async () => {
      await getGalleryPhoto(token, "gallery1", "orphanphoto.jpg", 404);
    });
    test("Get invalid.jpg", async () => {
      await getGalleryPhoto(token, "gallery1", "invalid.jpg", 404);
    });
  });
  describe("Gallery 2", () => {
    test("Get gallery1photo.jpg", async () => {
      await getGalleryPhoto(token, "gallery2", "gallery1photo.jpg", 404);
    });
    test("Get gallery12photo.jpg", async () => {
      const result = await getGalleryPhoto(
        token,
        "gallery2",
        "gallery12photo.jpg"
      );
      expect(result.body.id).toBeDefined();
      expect(result.body.id).toBe("gallery12photo.jpg");
    });
    test("Get gallery2photo.jpg", async () => {
      const result = await getGalleryPhoto(
        token,
        "gallery2",
        "gallery2photo.jpg"
      );
      expect(result.body.id).toBeDefined();
      expect(result.body.id).toBe("gallery2photo.jpg");
    });
    test("Get orphanphoto.jpg", async () => {
      await getGalleryPhoto(token, "gallery2", "orphanphoto.jpg", 404);
    });
  });
  describe("Gallery :all", () => {
    test("Get gallery1photo.jpg", async () => {
      await getGalleryPhoto(token, ":all", "gallery1photo.jpg", 403);
    });
    test("Get gallery12photo.jpg", async () => {
      await getGalleryPhoto(token, ":all", "gallery12photo.jpg", 403);
    });
    test("Get gallery2photo.jpg", async () => {
      await getGalleryPhoto(token, ":all", "gallery2photo.jpg", 403);
    });
    test("Get orphanphoto.jpg", async () => {
      await getGalleryPhoto(token, ":all", "orphanphoto.jpg", 403);
    });
    test("Get invalid.jpg", async () => {
      await getGalleryPhoto(token, ":all", "invalid.jpg", 403);
    });
  });
  describe("Gallery :public", () => {
    test("Get gallery1photo.jpg", async () => {
      await getGalleryPhoto(token, ":public", "gallery1photo.jpg", 403);
    });
    test("Get gallery12photo.jpg", async () => {
      await getGalleryPhoto(token, ":public", "gallery12photo.jpg", 403);
    });
    test("Get gallery2photo.jpg", async () => {
      await getGalleryPhoto(token, ":public", "gallery2photo.jpg", 403);
    });
    test("Get orphanphoto.jpg", async () => {
      await getGalleryPhoto(token, ":public", "orphanphoto.jpg", 403);
    });
    test("Get invalid.jpg", async () => {
      await getGalleryPhoto(token, ":public", "invalid.jpg", 403);
    });
  });
  describe("Gallery :private", () => {
    test("Get gallery1photo.jpg", async () => {
      await getGalleryPhoto(token, ":private", "gallery1photo.jpg", 403);
    });
    test("Get orphanphoto.jpg", async () => {
      await getGalleryPhoto(token, ":private", "orphanphoto.jpg", 403);
    });
    test("Get invalid.jpg", async () => {
      await getGalleryPhoto(token, ":private", "invalid.jpg", 403);
    });
  });
  describe("Invalid gallery", () => {
    test("Get orphanphoto.jpg", async () => {
      await getGalleryPhoto(token, "invalid", "orphanphoto.jpg", 403);
    });
  });
});

describe("As publicUser", () => {
  let token = undefined;
  beforeAll(async () => {
    token = await loginUser(api, "publicUser");
  });

  describe("Gallery 1", () => {
    test("Get gallery1photo.jpg", async () => {
      const result = await getGalleryPhoto(
        token,
        "gallery1",
        "gallery1photo.jpg"
      );
      expect(result.body.id).toBeDefined();
      expect(result.body.id).toBe("gallery1photo.jpg");
    });
    test("Get gallery12photo.jpg", async () => {
      const result = await getGalleryPhoto(
        token,
        "gallery1",
        "gallery12photo.jpg"
      );
      expect(result.body.id).toBeDefined();
      expect(result.body.id).toBe("gallery12photo.jpg");
    });
    test("Get gallery2photo.jpg", async () => {
      await getGalleryPhoto(token, "gallery1", "gallery2photo.jpg", 404);
    });
    test("Get orphanphoto.jpg", async () => {
      await getGalleryPhoto(token, "gallery1", "orphanphoto.jpg", 404);
    });
    test("Get invalid.jpg", async () => {
      await getGalleryPhoto(token, "gallery1", "invalid.jpg", 404);
    });
  });
  describe("Gallery 2", () => {
    test("Get gallery1photo.jpg", async () => {
      await getGalleryPhoto(token, "gallery2", "gallery1photo.jpg", 404);
    });
    test("Get gallery12photo.jpg", async () => {
      const result = await getGalleryPhoto(
        token,
        "gallery2",
        "gallery12photo.jpg"
      );
      expect(result.body.id).toBeDefined();
      expect(result.body.id).toBe("gallery12photo.jpg");
    });
    test("Get gallery2photo.jpg", async () => {
      const result = await getGalleryPhoto(
        token,
        "gallery2",
        "gallery2photo.jpg"
      );
      expect(result.body.id).toBeDefined();
      expect(result.body.id).toBe("gallery2photo.jpg");
    });
    test("Get orphanphoto.jpg", async () => {
      await getGalleryPhoto(token, "gallery2", "orphanphoto.jpg", 404);
    });
  });
  describe("Gallery :all", () => {
    test("Get gallery1photo.jpg", async () => {
      await getGalleryPhoto(token, ":all", "gallery1photo.jpg", 403);
    });
    test("Get gallery12photo.jpg", async () => {
      await getGalleryPhoto(token, ":all", "gallery12photo.jpg", 403);
    });
    test("Get gallery2photo.jpg", async () => {
      await getGalleryPhoto(token, ":all", "gallery2photo.jpg", 403);
    });
    test("Get orphanphoto.jpg", async () => {
      await getGalleryPhoto(token, ":all", "orphanphoto.jpg", 403);
    });
    test("Get invalid.jpg", async () => {
      await getGalleryPhoto(token, ":all", "invalid.jpg", 403);
    });
  });
  describe("Gallery :public", () => {
    test("Get gallery1photo.jpg", async () => {
      const result = await getGalleryPhoto(
        token,
        ":public",
        "gallery1photo.jpg"
      );
      expect(result.body.id).toBeDefined();
      expect(result.body.id).toBe("gallery1photo.jpg");
    });
    test("Get gallery12photo.jpg", async () => {
      const result = await getGalleryPhoto(
        token,
        ":public",
        "gallery12photo.jpg"
      );
      expect(result.body.id).toBeDefined();
      expect(result.body.id).toBe("gallery12photo.jpg");
    });
    test("Get gallery2photo.jpg", async () => {
      const result = await getGalleryPhoto(
        token,
        ":public",
        "gallery2photo.jpg"
      );
      expect(result.body.id).toBeDefined();
      expect(result.body.id).toBe("gallery2photo.jpg");
    });
    test("Get orphanphoto.jpg", async () => {
      await getGalleryPhoto(token, ":public", "orphanphoto.jpg", 404);
    });
    test("Get invalid.jpg", async () => {
      await getGalleryPhoto(token, ":public", "invalid.jpg", 404);
    });
  });
  describe("Gallery :private", () => {
    test("Get gallery1photo.jpg", async () => {
      await getGalleryPhoto(token, ":private", "gallery1photo.jpg", 403);
    });
    test("Get orphanphoto.jpg", async () => {
      await getGalleryPhoto(token, ":private", "orphanphoto.jpg", 403);
    });
    test("Get invalid.jpg", async () => {
      await getGalleryPhoto(token, ":private", "invalid.jpg", 403);
    });
  });
  describe("Invalid gallery", () => {
    test("Get orphanphoto.jpg", async () => {
      await getGalleryPhoto(token, "invalid", "orphanphoto.jpg", 404);
    });
  });
});

afterAll(() => {});
