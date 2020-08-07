import token from "./token";

test("Basic", () => {
  token.setToken("t");
  expect(token.createConfig()).toStrictEqual({
    headers: { Authorization: "bearer t" },
  });
  token.clearToken();
  expect(token.createConfig()).toStrictEqual({});
  token.setToken("t");
  expect(token.createConfig()).toStrictEqual({
    headers: { Authorization: "bearer t" },
  });
  token.setToken();
  expect(token.createConfig()).toStrictEqual({});
});
