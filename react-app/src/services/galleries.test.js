import axios from "axios";

import galleries from "./galleries";

jest.mock("axios");

test("getAll()", () => {
  const allGalleries = [{ name: "Dummy" }];
  axios.get.mockResolvedValue({ data: allGalleries });

  galleries.getAll().then((data) => expect(data).toStrictEqual(allGalleries));
  expect(axios.get.mock.calls[0][0]).toBe("/api/galleries");
});

test("get()", () => {
  const gallery = [{ name: "Dummy" }];
  axios.get.mockResolvedValue({ data: gallery });

  galleries.get("dummy").then((data) => expect(data).toStrictEqual(gallery));
  expect(axios.get.mock.calls[1][0]).toBe("/api/galleries/dummy");
});
