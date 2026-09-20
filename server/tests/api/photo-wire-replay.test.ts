import { vi } from "vitest";
import { TEST_CONFIG, seedApiFixture } from "./fixture.js";

vi.mock("../../lib/config/index.js", () => ({ default: TEST_CONFIG }));

import { init } from "../../app.js";
import galleryModel from "../../models/gallery.js";
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

describe("photo and gallery routes send what the model produced", () => {
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

  test("gallery list and single gallery, with their photos", async () => {
    const token = await loginUser(api, "admin");
    const list = await api
      .get("/api/v1/galleries")
      .set("Cookie", `pd_access=${token}`)
      .expect(200);
    const expected = await galleryModel().getGalleries();
    expect(list.body.length).toBe(expected.length);
    for (const gallery of expected) {
      const sent = (list.body as { id: string }[]).find((g) => g.id === gallery.id);
      // The route adds `hideMap` for the requester; the rest is the model's.
      expect(sent).toEqual({ ...asJsonStringifyWould(gallery) as object, hideMap: false });
    }
    const single = await api
      .get("/api/v1/galleries/gallery1")
      .set("Cookie", `pd_access=${token}`)
      .expect(200);
    const model = asJsonStringifyWould(await galleryModel().getGallery("gallery1", true)) as {
      photos: unknown[];
    };
    expect(model.photos.length).toBeGreaterThan(0);
    expect(single.body).toEqual({ ...model, hideMap: false });
  });
});
