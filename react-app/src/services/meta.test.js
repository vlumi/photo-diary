import axios from "axios";

import meta from "./meta";

jest.mock("axios");

test("getAll()", () => {
  const allMeta = { name: "Dummy" };
  axios.get.mockResolvedValue({ data: allMeta });

  meta.getAll().then((data) => expect(data).toStrictEqual(allMeta));
  expect(axios.get.mock.calls[0][0]).toBe("/api/v1/meta");
});

test("get()", () => {
  const data = { name: "Dummy" };
  axios.get.mockResolvedValue({ data: data });

  meta.get("dummy").then((data) => expect(data).toStrictEqual(data));
  expect(axios.get.mock.calls[0][0]).toBe("/api/v1/meta/dummy");
});
