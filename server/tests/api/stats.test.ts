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

const postStats = async (
  token: string | undefined,
  galleryId: string,
  body: Record<string, unknown> = {},
  status = 200
) =>
  api
    .post(`/api/v1/galleries/${galleryId}/stats`)
    .set("Authorization", `Bearer ${token}`)
    .send(body)
    .expect(status);

describe("auth", () => {
  test("guest with no grant → 403 (gallery1 isn't open to :guest)", async () => {
    await api.post("/api/v1/galleries/gallery1/stats").send({}).expect(403);
  });
  test("user with grant on the gallery → 200", async () => {
    const token = await loginUser(api, "gallery1user");
    await postStats(token, "gallery1");
  });
  test(":guest grant on gallery3 → anon allowed", async () => {
    await api.post("/api/v1/galleries/gallery3/stats").send({}).expect(200);
  });
  test("user without a grant on the gallery → 403", async () => {
    const token = await loginUser(api, "simpleuser");
    await postStats(token, "gallery1", {}, 403);
  });
  test("admin → 200 on any gallery", async () => {
    const token = await loginUser(api, "admin");
    await postStats(token, "gallery2");
  });
});

describe("response shape (unfiltered)", () => {
  let token: string | undefined;
  beforeAll(async () => {
    token = await loginUser(api, "admin");
  });

  test("gallery1: total + byCategory + summary", async () => {
    const res = await postStats(token, "gallery1");
    expect(res.body.total).toBe(2);
    expect(res.body.byCategory.country).toEqual({ jp: 1, nl: 1 });
    expect(res.body.byCategory.year).toEqual({ "2018": 1, "2020": 1 });
    expect(res.body.byCategory.cameraMake).toEqual({
      FUJIFILM: 1,
      Panasonic: 1,
    });
    expect(res.body.byCategory.month).toEqual({ "5": 1, "7": 1 });
    expect(res.body.byCategory.hour).toEqual({ "13": 1, "14": 1 });
    expect(res.body.summary.first).toBe("2018-05-04");
    expect(res.body.summary.last).toBe("2020-07-04");
    expect(res.body.summary.variety.camera).toBe(2);
    expect(res.body.summary.variety.country).toBe(2);
  });

  test("byYearMonth structure", async () => {
    const res = await postStats(token, "gallery1");
    expect(res.body.byYearMonth).toEqual({
      "2018": { "5": 1 },
      "2020": { "7": 1 },
    });
  });

  test("daysInYear is the calendar year length", async () => {
    const res = await postStats(token, "gallery1");
    // 2020 is a leap year; 2018 is not.
    expect(res.body.daysInYear).toEqual({ "2018": 365, "2020": 366 });
  });

  test("daysInYearMonth has the calendar month length", async () => {
    const res = await postStats(token, "gallery1");
    // May 2018 = 31 days, July 2020 = 31 days
    expect(res.body.daysInYearMonth["2018"]["5"]).toBe(31);
    expect(res.body.daysInYearMonth["2020"]["7"]).toBe(31);
  });

  test("camera bucket uses formatGear output", async () => {
    const res = await postStats(token, "gallery1");
    expect(res.body.byCategory.camera).toHaveProperty("FUJIFILM X-T2");
    expect(res.body.byCategory.camera).toHaveProperty("Panasonic DMC-GX7");
  });
});

describe("filter", () => {
  let token: string | undefined;
  beforeAll(async () => {
    token = await loginUser(api, "admin");
  });

  test("country filter narrows the result set", async () => {
    const res = await postStats(token, "gallery1", {
      filter: { general: { country: ["jp"] } },
    });
    expect(res.body.total).toBe(1);
    expect(res.body.byCategory.country).toEqual({ jp: 1 });
    expect(res.body.byCategory.year).toEqual({ "2018": 1 });
  });

  test("filter with no matches → zero total + empty categories", async () => {
    const res = await postStats(token, "gallery1", {
      filter: { general: { country: ["us"] } },
    });
    expect(res.body.total).toBe(0);
    expect(res.body.byCategory.country).toEqual({});
    expect(res.body.byCategory.year).toEqual({});
    expect(res.body.summary.first).toBeUndefined();
  });

  test("AND across topics", async () => {
    const res = await postStats(token, "gallery1", {
      filter: {
        general: { country: ["jp"] },
        time: { year: ["2020"] },
      },
    });
    // jp is 2018; no jp in 2020 → 0
    expect(res.body.total).toBe(0);
  });

  test("OR within a category", async () => {
    const res = await postStats(token, "gallery1", {
      filter: { general: { country: ["jp", "nl"] } },
    });
    expect(res.body.total).toBe(2);
  });
});

describe("scope + host-scope", () => {
  test("non-admin without grant on non-existent gallery → 403 (privacy collapse)", async () => {
    const token = await loginUser(api, "simpleuser");
    await postStats(token, "nosuchgallery", {}, 403);
  });
  test("admin on non-existent gallery → 200 with empty stats", async () => {
    const token = await loginUser(api, "admin");
    const res = await postStats(token, "nosuchgallery");
    expect(res.body.total).toBe(0);
    expect(res.body.byCategory.country).toEqual({});
  });
});

describe("cache", () => {
  test("subsequent unfiltered calls return the same cached object (no DB rebuild)", async () => {
    const token = await loginUser(api, "admin");
    const a = await postStats(token, "gallery1");
    const b = await postStats(token, "gallery1");
    // Same payload, same totals.
    expect(b.body).toEqual(a.body);
  });

  test("filtered call doesn't poison or read the unfiltered cache", async () => {
    const token = await loginUser(api, "admin");
    const unfiltered = await postStats(token, "gallery1");
    const filtered = await postStats(token, "gallery1", {
      filter: { general: { country: ["jp"] } },
    });
    expect(unfiltered.body.total).toBe(2);
    expect(filtered.body.total).toBe(1);
    // Unfiltered still returns the original after the filtered hit.
    const refetch = await postStats(token, "gallery1");
    expect(refetch.body.total).toBe(2);
  });

  test("photo update invalidates the cache for that photo's galleries", async () => {
    const token = await loginUser(api, "admin");
    const before = await postStats(token, "gallery1");
    expect(before.body.byCategory.country).toEqual({ jp: 1, nl: 1 });
    // Flip gallery1photo.jpg's country.
    await api
      .put("/api/v1/photos/gallery1photo.jpg")
      .set("Authorization", `Bearer ${token}`)
      .send({ taken: { location: { country: "fi" } } })
      .expect(204);
    const after = await postStats(token, "gallery1");
    expect(after.body.byCategory.country).toEqual({ fi: 1, nl: 1 });
  });

  test("link / unlink invalidates the receiving gallery cache", async () => {
    const token = await loginUser(api, "admin");
    const before = await postStats(token, "gallery3");
    expect(before.body.total).toBe(1);
    // Link gallery1photo.jpg into gallery3.
    await api
      .put("/api/v1/gallery-photos/gallery3/gallery1photo.jpg")
      .set("Authorization", `Bearer ${token}`)
      .expect(204);
    const after = await postStats(token, "gallery3");
    expect(after.body.total).toBe(2);
  });
});

describe("unknown bucket", () => {
  test("photos with empty fields bucket under 'unknown'", async () => {
    const token = await loginUser(api, "admin");
    // gallery2 has gallery12photo.jpg + gallery2photo.jpg.
    // gallery12photo.jpg has no coords; gallery2photo.jpg lens make undefined.
    const res = await postStats(token, "gallery2");
    expect(res.body.total).toBe(2);
    // Both photos have valid camera + lens; no unknown bucket expected.
    expect(res.body.byCategory.country).toEqual({ nl: 1, jp: 1 });
  });
});
