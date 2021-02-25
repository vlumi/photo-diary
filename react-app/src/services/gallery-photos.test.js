import axios from "axios";

import galleryPhotos from "./gallery-photos";

jest.mock("axios");

test("getAll()", () => {
  const allGalleries = [{ name: "Dummy" }];
  axios.get.mockResolvedValue({ data: allGalleries });

  galleryPhotos
    .getAll()
    .then((data) => expect(data).toStrictEqual(allGalleries));
  expect(axios.get.mock.calls[0][0]).toBe("/api/gallery-photos");
});

test("get()", () => {
  const gallery = [{ name: "Dummy" }];
  axios.get.mockResolvedValue({ data: gallery });

  galleryPhotos
    .get("dummy")
    .then((data) => expect(data).toStrictEqual(gallery));
  expect(axios.get.mock.calls[0][0]).toBe("/api/gallery-photos/dummy");
});
