import { vi } from "vitest";
import { TEST_CONFIG, seedApiFixture } from "./fixture.js";

vi.mock("../../lib/config/index.js", () => ({ default: TEST_CONFIG }));

import { init } from "../../app.js";
import { createApi, loginUser } from "./helper.js";

const { api } = createApi();

beforeEach(async () => {
  await seedApiFixture();
  await init();
});


const getGalleryPhoto = async (token: string | undefined, galleryId: string, photoId: string, status = 200) =>
  api
    .get(`/api/v1/gallery-photos/${galleryId}/${photoId}`)
    .set("Authorization", `Bearer ${token}`)
    .expect(status);

describe("As guest", () => {
  describe("Gallery 1", () => {
    test("Get gallery1photo.jpg", async () => {
      await api
        .get("/api/v1/gallery-photos/gallery1/gallery1photo.jpg")
        .expect(404);
    });
    test("Get gallery12photo.jpg", async () => {
      await api
        .get("/api/v1/gallery-photos/gallery1/gallery12photo.jpg")
        .expect(404);
    });
    test("Get gallery2photo.jpg", async () => {
      await api
        .get("/api/v1/gallery-photos/gallery1/gallery2photo.jpg")
        .expect(404);
    });
    test("Get orphanphoto.jpg", async () => {
      await api.get("/api/v1/gallery-photos/gallery1/orphanphoto.jpg").expect(404);
    });
    test("Get invalid.jpg", async () => {
      await api.get("/api/v1/gallery-photos/gallery1/orphanphoto.jpg").expect(404);
    });
  });
  describe("Gallery 2", () => {
    test("Get gallery1photo.jpg", async () => {
      await api
        .get("/api/v1/gallery-photos/gallery2/gallery1photo.jpg")
        .expect(404);
    });
    test("Get gallery12photo.jpg", async () => {
      await api
        .get("/api/v1/gallery-photos/gallery2/gallery12photo.jpg")
        .expect(404);
    });
    test("Get gallery2photo.jpg", async () => {
      await api
        .get("/api/v1/gallery-photos/gallery2/gallery2photo.jpg")
        .expect(404);
    });
    test("Get orphanphoto.jpg", async () => {
      await api.get("/api/v1/gallery-photos/gallery2/orphanphoto.jpg").expect(404);
    });
  });
  describe("Gallery :all", () => {
    test("Get gallery1photo.jpg", async () => {
      await api.get("/api/v1/gallery-photos/:all/gallery1photo.jpg").expect(404);
    });
    test("Get gallery12photo.jpg", async () => {
      await api.get("/api/v1/gallery-photos/:all/gallery12photo.jpg").expect(404);
    });
    test("Get gallery2photo.jpg", async () => {
      await api.get("/api/v1/gallery-photos/:all/gallery2photo.jpg").expect(404);
    });
    test("Get orphanphoto.jpg", async () => {
      await api.get("/api/v1/gallery-photos/:all/orphanphoto.jpg").expect(404);
    });
    test("Get invalid.jpg", async () => {
      await api.get("/api/v1/gallery-photos/:all/orphanphoto.jpg").expect(404);
    });
  });
  describe("Gallery :public", () => {
    test("Get gallery1photo.jpg", async () => {
      await api
        .get("/api/v1/gallery-photos/:public/gallery1photo.jpg")
        .expect(404);
    });
    test("Get gallery12photo.jpg", async () => {
      await api
        .get("/api/v1/gallery-photos/:public/gallery12photo.jpg")
        .expect(404);
    });
    test("Get gallery2photo.jpg", async () => {
      await api
        .get("/api/v1/gallery-photos/:public/gallery2photo.jpg")
        .expect(404);
    });
    test("Get orphanphoto.jpg", async () => {
      await api.get("/api/v1/gallery-photos/:public/orphanphoto.jpg").expect(404);
    });
    test("Get invalid.jpg", async () => {
      await api.get("/api/v1/gallery-photos/:public/orphanphoto.jpg").expect(404);
    });
  });
  describe("Invalid gallery", () => {
    test("Get orphanphoto.jpg", async () => {
      await api.get("/api/v1/gallery-photos/gallery2/orphanphoto.jpg").expect(404);
    });
  });
});

describe("As admin", () => {
  let token: string | undefined = undefined;
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
  describe("Gallery :all (no pseudo-gallery)", () => {
    test("Get gallery1photo.jpg", async () => {
      await getGalleryPhoto(token, ":all", "gallery1photo.jpg", 404);
    });
  });
  describe("Gallery :public (no pseudo-gallery)", () => {
    test("Get gallery1photo.jpg", async () => {
      await getGalleryPhoto(token, ":public", "gallery1photo.jpg", 404);
    });
  });
  describe("Invalid gallery", () => {
    test("Get orphanphoto.jpg", async () => {
      await getGalleryPhoto(token, "invalid", "orphanphoto.jpg", 404);
    });
  });
});

describe("As gallery1admin", () => {
  let token: string | undefined = undefined;
  beforeAll(async () => {
    token = await loginUser(api, "gallery1admin");
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
  describe("Gallery 2 (no access)", () => {
    test("Get gallery1photo.jpg", async () => {
      await getGalleryPhoto(token, "gallery2", "gallery1photo.jpg", 404);
    });
    test("Get gallery12photo.jpg", async () => {
      await getGalleryPhoto(token, "gallery2", "gallery12photo.jpg", 404);
    });
    test("Get gallery2photo.jpg", async () => {
      await getGalleryPhoto(token, "gallery2", "gallery2photo.jpg", 404);
    });
    test("Get orphanphoto.jpg", async () => {
      await getGalleryPhoto(token, "gallery2", "orphanphoto.jpg", 404);
    });
  });
  describe("Gallery :all (admin-only post-#394)", () => {
    test("Get gallery1photo.jpg", async () => {
      await getGalleryPhoto(token, ":all", "gallery1photo.jpg", 404);
    });
    test("Get invalid.jpg", async () => {
      await getGalleryPhoto(token, ":all", "invalid.jpg", 404);
    });
  });
  describe("Gallery :public (admin-only post-#394)", () => {
    test("Get gallery1photo.jpg", async () => {
      await getGalleryPhoto(token, ":public", "gallery1photo.jpg", 404);
    });
    test("Get invalid.jpg", async () => {
      await getGalleryPhoto(token, ":public", "invalid.jpg", 404);
    });
  });
  describe("Invalid gallery", () => {
    test("Get orphanphoto.jpg", async () => {
      await getGalleryPhoto(token, "invalid", "orphanphoto.jpg", 404);
    });
  });
});

describe("As gallery2admin", () => {
  let token: string | undefined = undefined;
  beforeAll(async () => {
    token = await loginUser(api, "gallery2admin");
  });

  describe("Gallery 1", () => {
    test("Get gallery1photo.jpg", async () => {
      await getGalleryPhoto(token, "gallery1", "gallery1photo.jpg", 404);
    });
    test("Get gallery12photo.jpg", async () => {
      await getGalleryPhoto(token, "gallery1", "gallery12photo.jpg", 404);
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
      await getGalleryPhoto(token, ":all", "gallery1photo.jpg", 404);
    });
    test("Get gallery12photo.jpg", async () => {
      await getGalleryPhoto(token, ":all", "gallery12photo.jpg", 404);
    });
    test("Get gallery2photo.jpg", async () => {
      await getGalleryPhoto(token, ":all", "gallery2photo.jpg", 404);
    });
    test("Get orphanphoto.jpg", async () => {
      await getGalleryPhoto(token, ":all", "orphanphoto.jpg", 404);
    });
    test("Get invalid.jpg", async () => {
      await getGalleryPhoto(token, ":all", "invalid.jpg", 404);
    });
  });
  describe("Gallery :public", () => {
    test("Get gallery1photo.jpg", async () => {
      await getGalleryPhoto(token, ":public", "gallery1photo.jpg", 404);
    });
    test("Get gallery12photo.jpg", async () => {
      await getGalleryPhoto(token, ":public", "gallery12photo.jpg", 404);
    });
    test("Get gallery2photo.jpg", async () => {
      await getGalleryPhoto(token, ":public", "gallery2photo.jpg", 404);
    });
    test("Get orphanphoto.jpg", async () => {
      await getGalleryPhoto(token, ":public", "orphanphoto.jpg", 404);
    });
    test("Get invalid.jpg", async () => {
      await getGalleryPhoto(token, ":public", "invalid.jpg", 404);
    });
  });
  describe("Invalid gallery", () => {
    test("Get orphanphoto.jpg", async () => {
      await getGalleryPhoto(token, "invalid", "orphanphoto.jpg", 404);
    });
  });
});

describe("As plainuser", () => {
  let token: string | undefined = undefined;
  beforeAll(async () => {
    token = await loginUser(api, "plainuser");
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
      expect(result.body.id).toBe("gallery12photo.jpg");
    });
    test("Get gallery2photo.jpg", async () => {
      const result = await getGalleryPhoto(
        token,
        "gallery2",
        "gallery2photo.jpg"
      );
      expect(result.body.id).toBe("gallery2photo.jpg");
    });
    test("Get orphanphoto.jpg", async () => {
      await getGalleryPhoto(token, "gallery2", "orphanphoto.jpg", 404);
    });
  });
  describe("Gallery :all (admin-only post-#394)", () => {
    test("Get gallery1photo.jpg", async () => {
      await getGalleryPhoto(token, ":all", "gallery1photo.jpg", 404);
    });
    test("Get invalid.jpg", async () => {
      await getGalleryPhoto(token, ":all", "invalid.jpg", 404);
    });
  });
  describe("Gallery :public (admin-only post-#394)", () => {
    test("Get gallery1photo.jpg", async () => {
      await getGalleryPhoto(token, ":public", "gallery1photo.jpg", 404);
    });
    test("Get invalid.jpg", async () => {
      await getGalleryPhoto(token, ":public", "invalid.jpg", 404);
    });
  });
  describe("Invalid gallery", () => {
    test("Get orphanphoto.jpg", async () => {
      await getGalleryPhoto(token, "invalid", "orphanphoto.jpg", 404);
    });
  });
});

describe("As gallery1user", () => {
  let token: string | undefined = undefined;
  beforeAll(async () => {
    token = await loginUser(api, "gallery1user");
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
      await getGalleryPhoto(token, "gallery2", "gallery12photo.jpg", 404);
    });
    test("Get gallery2photo.jpg", async () => {
      await getGalleryPhoto(token, "gallery2", "gallery2photo.jpg", 404);
    });
    test("Get orphanphoto.jpg", async () => {
      await getGalleryPhoto(token, "gallery2", "orphanphoto.jpg", 404);
    });
  });
  describe("Gallery :all", () => {
    test("Get gallery1photo.jpg", async () => {
      await getGalleryPhoto(token, ":all", "gallery1photo.jpg", 404);
    });
    test("Get gallery12photo.jpg", async () => {
      await getGalleryPhoto(token, ":all", "gallery12photo.jpg", 404);
    });
    test("Get gallery2photo.jpg", async () => {
      await getGalleryPhoto(token, ":all", "gallery2photo.jpg", 404);
    });
    test("Get orphanphoto.jpg", async () => {
      await getGalleryPhoto(token, ":all", "orphanphoto.jpg", 404);
    });
    test("Get invalid.jpg", async () => {
      await getGalleryPhoto(token, ":all", "invalid.jpg", 404);
    });
  });
  describe("Gallery :public", () => {
    test("Get gallery1photo.jpg", async () => {
      await getGalleryPhoto(token, ":public", "gallery1photo.jpg", 404);
    });
    test("Get gallery12photo.jpg", async () => {
      await getGalleryPhoto(token, ":public", "gallery12photo.jpg", 404);
    });
    test("Get gallery2photo.jpg", async () => {
      await getGalleryPhoto(token, ":public", "gallery2photo.jpg", 404);
    });
    test("Get orphanphoto.jpg", async () => {
      await getGalleryPhoto(token, ":public", "orphanphoto.jpg", 404);
    });
    test("Get invalid.jpg", async () => {
      await getGalleryPhoto(token, ":public", "invalid.jpg", 404);
    });
  });
  describe("Invalid gallery", () => {
    test("Get orphanphoto.jpg", async () => {
      await getGalleryPhoto(token, "invalid", "orphanphoto.jpg", 404);
    });
  });
});

describe("As gallery12user", () => {
  let token: string | undefined = undefined;
  beforeAll(async () => {
    token = await loginUser(api, "gallery12user");
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
      await getGalleryPhoto(token, ":all", "gallery1photo.jpg", 404);
    });
    test("Get gallery12photo.jpg", async () => {
      await getGalleryPhoto(token, ":all", "gallery12photo.jpg", 404);
    });
    test("Get gallery2photo.jpg", async () => {
      await getGalleryPhoto(token, ":all", "gallery2photo.jpg", 404);
    });
    test("Get orphanphoto.jpg", async () => {
      await getGalleryPhoto(token, ":all", "orphanphoto.jpg", 404);
    });
    test("Get invalid.jpg", async () => {
      await getGalleryPhoto(token, ":all", "invalid.jpg", 404);
    });
  });
  describe("Gallery :public", () => {
    test("Get gallery1photo.jpg", async () => {
      await getGalleryPhoto(token, ":public", "gallery1photo.jpg", 404);
    });
    test("Get gallery12photo.jpg", async () => {
      await getGalleryPhoto(token, ":public", "gallery12photo.jpg", 404);
    });
    test("Get gallery2photo.jpg", async () => {
      await getGalleryPhoto(token, ":public", "gallery2photo.jpg", 404);
    });
    test("Get orphanphoto.jpg", async () => {
      await getGalleryPhoto(token, ":public", "orphanphoto.jpg", 404);
    });
    test("Get invalid.jpg", async () => {
      await getGalleryPhoto(token, ":public", "invalid.jpg", 404);
    });
  });
  describe("Invalid gallery", () => {
    test("Get orphanphoto.jpg", async () => {
      await getGalleryPhoto(token, "invalid", "orphanphoto.jpg", 404);
    });
  });
});

describe("As publicuser", () => {
  let token: string | undefined = undefined;
  beforeAll(async () => {
    token = await loginUser(api, "publicuser");
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
      await getGalleryPhoto(token, ":all", "gallery1photo.jpg", 404);
    });
    test("Get gallery12photo.jpg", async () => {
      await getGalleryPhoto(token, ":all", "gallery12photo.jpg", 404);
    });
    test("Get gallery2photo.jpg", async () => {
      await getGalleryPhoto(token, ":all", "gallery2photo.jpg", 404);
    });
    test("Get orphanphoto.jpg", async () => {
      await getGalleryPhoto(token, ":all", "orphanphoto.jpg", 404);
    });
    test("Get invalid.jpg", async () => {
      await getGalleryPhoto(token, ":all", "invalid.jpg", 404);
    });
  });
  describe("Gallery :public (admin-only post-#394)", () => {
    test("Get gallery1photo.jpg", async () => {
      await getGalleryPhoto(token, ":public", "gallery1photo.jpg", 404);
    });
    test("Get invalid.jpg", async () => {
      await getGalleryPhoto(token, ":public", "invalid.jpg", 404);
    });
  });
  describe("Invalid gallery", () => {
    test("Get orphanphoto.jpg", async () => {
      await getGalleryPhoto(token, "invalid", "orphanphoto.jpg", 404);
    });
  });
});


// New filtered + scoped query endpoint (#406) — drives the
// per-view fetch the public gallery viewer migrates to.
describe("POST /:galleryId/query (filtered + scoped fetch)", () => {
  const postQuery = (
    token: string | undefined,
    galleryId: string,
    body: Record<string, unknown> = {},
    status = 200
  ) => {
    const req = api
      .post(`/api/v1/gallery-photos/${galleryId}/query`)
      .send(body);
    if (token) req.set("Authorization", `Bearer ${token}`);
    return req.expect(status);
  };

  test("admin: empty body returns the whole gallery", async () => {
    const token = await loginUser(api, "admin");
    const res = await postQuery(token, "gallery1");
    expect(res.body.length).toBe(2);
  });

  test("admin: year scope narrows the result", async () => {
    const token = await loginUser(api, "admin");
    const res = await postQuery(token, "gallery1", { year: 2018 });
    expect(res.body.length).toBe(1);
    expect(res.body[0].id).toBe("gallery1photo.jpg");
  });

  test("admin: month + year scope narrows further", async () => {
    const token = await loginUser(api, "admin");
    const res = await postQuery(token, "gallery1", { year: 2020, month: 7 });
    expect(res.body.length).toBe(1);
  });

  test("admin: filter wire shape narrows by country", async () => {
    const token = await loginUser(api, "admin");
    const res = await postQuery(token, "gallery1", {
      filter: { general: { country: ["jp"] } },
    });
    expect(res.body.length).toBe(1);
    expect(res.body[0].id).toBe("gallery1photo.jpg");
  });

  test("filter + scope compose (AND)", async () => {
    const token = await loginUser(api, "admin");
    const res = await postQuery(token, "gallery1", {
      year: 2020,
      filter: { general: { country: ["jp"] } },
    });
    expect(res.body.length).toBe(0);
  });

  test("dateRange narrows by inclusive YYYY-MM-DD bounds", async () => {
    const token = await loginUser(api, "admin");
    // Half-open `from` only — everything since 2020-01-01
    const sinceRes = await postQuery(token, "gallery1", {
      dateRange: { from: "2020-01-01" },
    });
    expect(sinceRes.body.map((p: { id: string }) => p.id).sort()).toEqual([
      "gallery12photo.jpg",
    ]);
    // Half-open `to` only — everything up to 2019-12-31
    const untilRes = await postQuery(token, "gallery1", {
      dateRange: { to: "2019-12-31" },
    });
    expect(untilRes.body.map((p: { id: string }) => p.id).sort()).toEqual([
      "gallery1photo.jpg",
    ]);
    // Both bounds — inclusive on both sides
    const closedRes = await postQuery(token, "gallery1", {
      dateRange: { from: "2018-01-01", to: "2018-12-31" },
    });
    expect(closedRes.body.length).toBe(1);
    expect(closedRes.body[0].id).toBe("gallery1photo.jpg");
  });

  test("dateRange composes with filter (AND)", async () => {
    const token = await loginUser(api, "admin");
    const res = await postQuery(token, "gallery1", {
      dateRange: { from: "2020-01-01" },
      filter: { general: { country: ["jp"] } },
    });
    // 2020 photo isn't `jp`; 2018 photo is `jp` but outside the range.
    expect(res.body.length).toBe(0);
  });

  test("empty dateRange is a no-op", async () => {
    const token = await loginUser(api, "admin");
    const res = await postQuery(token, "gallery1", { dateRange: {} });
    expect(res.body.length).toBe(2);
  });

  test("malformed date string → 400", async () => {
    const token = await loginUser(api, "admin");
    await postQuery(token, "gallery1", { dateRange: { from: "2020/01/01" } }, 400);
  });

  test("guest blocked from gallery1 → empty array (privacy collapse)", async () => {
    const res = await postQuery(undefined, "gallery1");
    expect(res.body).toEqual([]);
  });

  test(":guest grant on gallery3 → anon allowed", async () => {
    const res = await postQuery(undefined, "gallery3");
    expect(res.body.length).toBe(1);
  });
});

describe("POST /:galleryId/counts (year heatmap)", () => {
  const postCounts = (
    token: string | undefined,
    galleryId: string,
    body: Record<string, unknown> = {},
    status = 200
  ) => {
    const req = api
      .post(`/api/v1/gallery-photos/${galleryId}/counts`)
      .send(body);
    if (token) req.set("Authorization", `Bearer ${token}`);
    return req.expect(status);
  };

  test("admin: keyed by YYYY-MM-DD across every year photographed", async () => {
    const token = await loginUser(api, "admin");
    const res = await postCounts(token, "gallery1");
    expect(res.body).toEqual({
      "2018-05-04": 1,
      "2020-07-04": 1,
    });
  });

  test("admin: year scope narrows the bucket set", async () => {
    const token = await loginUser(api, "admin");
    const res = await postCounts(token, "gallery1", { year: 2018 });
    expect(res.body).toEqual({ "2018-05-04": 1 });
  });

  test("filter narrows the bucket set", async () => {
    const token = await loginUser(api, "admin");
    const res = await postCounts(token, "gallery1", {
      filter: { general: { country: ["jp"] } },
    });
    expect(res.body).toEqual({ "2018-05-04": 1 });
  });

  test("guest blocked from gallery1 → empty object", async () => {
    const res = await postCounts(undefined, "gallery1");
    expect(res.body).toEqual({});
  });
});

describe("POST /:galleryId/neighbors (photo modal navigation)", () => {
  const postNeighbors = (
    token: string | undefined,
    galleryId: string,
    body: Record<string, unknown>,
    status = 200
  ) => {
    const req = api
      .post(`/api/v1/gallery-photos/${galleryId}/neighbors`)
      .send(body);
    if (token) req.set("Authorization", `Bearer ${token}`);
    return req.expect(status);
  };

  test("middle photo: previous + next + first + last present", async () => {
    // gallery1: gallery1photo.jpg (2018-05-04), gallery12photo.jpg (2020-07-04).
    // Querying the second one → previous is the first, next is undefined.
    const token = await loginUser(api, "admin");
    const res = await postNeighbors(token, "gallery1", {
      photoId: "gallery12photo.jpg",
    });
    expect(res.body.previous?.id).toBe("gallery1photo.jpg");
    expect(res.body.next).toBeUndefined();
    expect(res.body.first?.id).toBe("gallery1photo.jpg");
    expect(res.body.last?.id).toBe("gallery12photo.jpg");
    expect(res.body.position).toBe(2);
    expect(res.body.total).toBe(2);
  });

  test("first photo of set: previous undefined, next is the second", async () => {
    const token = await loginUser(api, "admin");
    const res = await postNeighbors(token, "gallery1", {
      photoId: "gallery1photo.jpg",
    });
    expect(res.body.previous).toBeUndefined();
    expect(res.body.next?.id).toBe("gallery12photo.jpg");
    expect(res.body.position).toBe(1);
    expect(res.body.total).toBe(2);
  });

  test("filter narrows the navigation set", async () => {
    const token = await loginUser(api, "admin");
    const res = await postNeighbors(token, "gallery1", {
      photoId: "gallery1photo.jpg",
      filter: { general: { country: ["jp"] } },
    });
    // Only the jp photo matches; first + last = it, previous + next undefined.
    expect(res.body.first?.id).toBe("gallery1photo.jpg");
    expect(res.body.last?.id).toBe("gallery1photo.jpg");
    expect(res.body.previous).toBeUndefined();
    expect(res.body.next).toBeUndefined();
    expect(res.body.position).toBe(1);
    expect(res.body.total).toBe(1);
  });

  test("current photo not in filtered set: first/last still surface", async () => {
    const token = await loginUser(api, "admin");
    const res = await postNeighbors(token, "gallery1", {
      photoId: "gallery12photo.jpg",
      filter: { general: { country: ["jp"] } },
    });
    // The nl photo is the current — filter excludes it.
    // first / last are the jp photo; no adjacency; position omitted.
    expect(res.body.first?.id).toBe("gallery1photo.jpg");
    expect(res.body.last?.id).toBe("gallery1photo.jpg");
    expect(res.body.previous).toBeUndefined();
    expect(res.body.next).toBeUndefined();
    expect(res.body.position).toBeUndefined();
    expect(res.body.total).toBe(1);
  });

  test("guest blocked from gallery1 → total:0 (privacy collapse)", async () => {
    const res = await postNeighbors(undefined, "gallery1", {
      photoId: "gallery1photo.jpg",
    });
    expect(res.body).toEqual({ total: 0 });
  });
});

describe("GET /:galleryId/filter-values (filter pill universe)", () => {
  const getFilterValues = (
    token: string | undefined,
    galleryId: string,
    lang?: string,
    status = 200
  ) => {
    const url =
      `/api/v1/gallery-photos/${galleryId}/filter-values` +
      (lang ? `?lang=${lang}` : "");
    const req = api.get(url);
    if (token) req.set("Authorization", `Bearer ${token}`);
    return req.expect(status);
  };

  test("admin: returns categoryValues + byCityLocalized", async () => {
    const token = await loginUser(api, "admin");
    const res = await getFilterValues(token, "gallery1");
    expect(res.body.categoryValues).toBeDefined();
    expect(res.body.byCityLocalized).toBeDefined();
    // gallery1 has photos with countries jp + nl — both should
    // surface in the unfiltered universe.
    expect(res.body.categoryValues.country).toEqual(
      expect.arrayContaining(["jp", "nl"])
    );
  });

  test("guest blocked from gallery1 → empty universe (privacy collapse)", async () => {
    const res = await getFilterValues(undefined, "gallery1");
    expect(res.body).toEqual({ categoryValues: {}, byCityLocalized: {} });
  });
});
