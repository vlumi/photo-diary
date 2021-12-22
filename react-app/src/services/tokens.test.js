import axios from "axios";

import tokens from "./tokens";

jest.mock("axios");

test("login()", () => {
  tokens.login("user", "password").then((data) => expect(data).toBeUndefined());
  expect(axios.post.mock.calls[0][0]).toBe("/api/v1/tokens");
  expect(axios.post.mock.calls[0][1]).toStrictEqual({
    id: "user",
    password: "password",
  });
});

test("logout()", () => {
  axios.delete.mockResolvedValue({ data: {} });

  tokens.logout().then((data) => expect(data).toStrictEqual({}));
  expect(axios.delete.mock.calls[0][0]).toBe("/api/v1/tokens");
  expect(axios.delete.mock.calls[0][1]).toStrictEqual({});
});
