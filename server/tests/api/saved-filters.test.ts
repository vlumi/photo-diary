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

const list = (token: string | undefined, galleryId: string, status = 200) => {
  const req = api.get(`/api/v1/galleries/${galleryId}/filters`);
  if (token) req.set("Authorization", `Bearer ${token}`);
  return req.expect(status);
};
const get = (
  token: string | undefined,
  galleryId: string,
  filterId: string,
  status = 200
) => {
  const req = api.get(
    `/api/v1/galleries/${galleryId}/filters/${filterId}`
  );
  if (token) req.set("Authorization", `Bearer ${token}`);
  return req.expect(status);
};
const create = (
  token: string | undefined,
  galleryId: string,
  body: Record<string, unknown>,
  status = 201
) => {
  const req = api
    .post(`/api/v1/galleries/${galleryId}/filters`)
    .send(body);
  if (token) req.set("Authorization", `Bearer ${token}`);
  return req.expect(status);
};
const update = (
  token: string | undefined,
  galleryId: string,
  filterId: string,
  body: Record<string, unknown>,
  status = 204
) => {
  const req = api
    .put(`/api/v1/galleries/${galleryId}/filters/${filterId}`)
    .send(body);
  if (token) req.set("Authorization", `Bearer ${token}`);
  return req.expect(status);
};
const remove = (
  token: string | undefined,
  galleryId: string,
  filterId: string,
  status = 204
) => {
  const req = api.delete(`/api/v1/galleries/${galleryId}/filters/${filterId}`);
  if (token) req.set("Authorization", `Bearer ${token}`);
  return req.expect(status);
};

describe("As admin", () => {
  let token: string;
  beforeEach(async () => {
    token = await loginUser(api, "admin");
  });

  test("CRUD round-trip", async () => {
    const definition = {
      filter: { general: { country: ["jp"] } },
      dateRange: { from: "2024-01-01", to: "2024-12-31" },
    };
    await create(token, "gallery1", {
      id: "japan-2024",
      title: "Japan 2024",
      description: "Spring trip across Honshu",
      definition,
    });
    const listed = await list(token, "gallery1");
    expect(listed.body.length).toBe(1);
    expect(listed.body[0]).toMatchObject({
      id: "japan-2024",
      galleryId: "gallery1",
      title: "Japan 2024",
      description: "Spring trip across Honshu",
      titleLocalized: {},
      descriptionLocalized: {},
      definition,
      ordinal: 0,
    });
    const one = await get(token, "gallery1", "japan-2024");
    expect(one.body.id).toBe("japan-2024");
    await update(token, "gallery1", "japan-2024", {
      title: "Trip — Japan 2024",
      description: "March 2024",
      definition: { dateRange: { from: "2024-03-01" } },
    });
    const after = await get(token, "gallery1", "japan-2024");
    expect(after.body.title).toBe("Trip — Japan 2024");
    expect(after.body.description).toBe("March 2024");
    expect(after.body.definition).toEqual({ dateRange: { from: "2024-03-01" } });
    await remove(token, "gallery1", "japan-2024");
    const empty = await list(token, "gallery1");
    expect(empty.body).toEqual([]);
  });

  test("localized title / description round-trip", async () => {
    await create(token, "gallery1", {
      id: "loc-test",
      title: "Landscapes",
      description: "Scenic shots.",
      titleLocalized: { fi: "Maisemia", ja: "風景" },
      descriptionLocalized: { fi: "Maisemakuvia." },
      definition: { filter: {} },
    });
    const after = await get(token, "gallery1", "loc-test");
    expect(after.body.titleLocalized).toEqual({ fi: "Maisemia", ja: "風景" });
    expect(after.body.descriptionLocalized).toEqual({ fi: "Maisemakuvia." });
    // Empty string clears that lang's overlay column.
    await update(token, "gallery1", "loc-test", {
      titleLocalized: { ja: "" },
    });
    const cleared = await get(token, "gallery1", "loc-test");
    expect(cleared.body.titleLocalized).toEqual({ fi: "Maisemia" });
    // Canonical untouched by overlay edits.
    expect(cleared.body.title).toBe("Landscapes");
  });

  test("duplicate id within the same gallery → 4xx", async () => {
    const definition = { filter: {} };
    await create(token, "gallery1", { id: "dup", definition });
    await create(token, "gallery1", { id: "dup", definition }, 422);
  });

  test("source gallery must exist", async () => {
    await create(token, "no-such-gallery", { id: "x", definition: {} }, 422);
  });

  test("id can't collide with an existing gallery id", async () => {
    // gallery2 exists in the fixture; using its id as a filter id
    // would shadow it in the public viewer's title-bar selector.
    await create(token, "gallery1", { id: "gallery2", definition: {} }, 422);
  });

  test("non-slug id rejected", async () => {
    await create(token, "gallery1", { id: "Has Spaces", definition: {} }, 400);
  });

  test("missing definition rejected", async () => {
    await create(token, "gallery1", { id: "no-def" } as never, 400);
  });

  test("GET on missing filter → 404", async () => {
    await get(token, "gallery1", "ghost", 404);
  });

  test("definition accepts a dateRange-only filter", async () => {
    await create(token, "gallery1", {
      id: "since-2020",
      definition: { dateRange: { from: "2020-01-01" } },
    });
    const one = await get(token, "gallery1", "since-2020");
    expect(one.body.definition).toEqual({
      dateRange: { from: "2020-01-01" },
    });
  });
});

describe("ACL", () => {
  test("guest can list public-gallery saved filters but not mutate", async () => {
    // Seed a filter on gallery3 (the public `:guest`-readable one).
    const adminToken = await loginUser(api, "admin");
    await create(adminToken, "gallery3", {
      id: "guest-readable",
      definition: { filter: {} },
    });
    // Guest read OK.
    const listed = await list(undefined, "gallery3");
    expect(listed.body.length).toBe(1);
    // Guest (anonymous) mutate is 403 — auth resolves to `:guest`
    // (configured for read-only access on gallery3) which fails the
    // gallery-editor check.
    await create(
      undefined,
      "gallery3",
      { id: "guest-cant-create", definition: {} },
      403
    );
  });

  test("blocked user can't read a gallery's filters", async () => {
    const adminToken = await loginUser(api, "admin");
    await create(adminToken, "gallery1", {
      id: "private",
      definition: { filter: {} },
    });
    const blockedToken = await loginUser(api, "blockeduser");
    // No view ACL → 401 / 403; current implementation throws AccessError → 403.
    await list(blockedToken, "gallery1", 403);
  });
});
