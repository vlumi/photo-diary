import { vi } from "vitest";
import { TEST_CONFIG, seedApiFixture } from "./fixture.js";

vi.mock("../../lib/config/index.js", () => ({ default: TEST_CONFIG }));

import { init } from "../../app.js";
import galleryPhotoModel from "../../models/gallery-photo.js";
import photoModel from "../../models/photo.js";
import { createApi, loginUser } from "./helper.js";

const { api } = createApi();

beforeEach(async () => {
  await seedApiFixture();
  await init();
});

// The photo routes serialize through a typed schema, which coerces
// rather than fails. What a route sends must stay exactly what the
// model produced, as plain JSON.stringify would have written it.
const asJsonStringifyWould = (value: unknown): unknown =>
  JSON.parse(JSON.stringify(value));

describe("photo routes send what the model produced", () => {
  test.each(["gallery1", "gallery2"])("query of %s", async (galleryId) => {
    const token = await loginUser(api, "admin");
    const expected = await galleryPhotoModel().queryGalleryPhotos(galleryId, {
      includePrivate: true,
    });
    expect(expected.length).toBeGreaterThan(0);
    const response = await api
      .post(`/api/v1/gallery-photos/${galleryId}/query`)
      .set("Cookie", `pd_access=${token}`)
      .send({})
      .expect(200);
    expect(response.body).toEqual(asJsonStringifyWould(expected));
  });

  test("single photo, in a gallery and across galleries", async () => {
    const token = await loginUser(api, "admin");
    const [first] = await galleryPhotoModel().queryGalleryPhotos("gallery1", {
      includePrivate: true,
    });
    const inGallery = await api
      .get(`/api/v1/gallery-photos/gallery1/${first!.id}`)
      .set("Cookie", `pd_access=${token}`)
      .expect(200);
    expect(inGallery.body).toEqual(
      asJsonStringifyWould(
        await galleryPhotoModel().getGalleryPhoto("gallery1", first!.id, undefined, true)
      )
    );
    const acrossGalleries = await api
      .get(`/api/v1/photos/${first!.id}`)
      .set("Cookie", `pd_access=${token}`)
      .expect(200);
    expect(acrossGalleries.body).toEqual(
      asJsonStringifyWould(await photoModel().getPhoto(first!.id))
    );
  });
});
