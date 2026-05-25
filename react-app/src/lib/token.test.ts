import token from "./token";

test("setTokens + clearTokens + createConfig", () => {
  token.setTokens("at", "rt");
  expect(token.createConfig()).toStrictEqual({
    headers: { Authorization: "bearer at" },
  });
  expect(token.getAccessToken()).toBe("at");
  expect(token.getRefreshToken()).toBe("rt");

  token.clearTokens();
  expect(token.createConfig()).toStrictEqual({});
  expect(token.getAccessToken()).toBeUndefined();
  expect(token.getRefreshToken()).toBeUndefined();

  // Setting only the access token still works (the refresh-token half
  // may not exist yet, e.g. on a 401-after-no-refresh code path).
  token.setTokens("at-only");
  expect(token.createConfig()).toStrictEqual({
    headers: { Authorization: "bearer at-only" },
  });
  expect(token.getRefreshToken()).toBeUndefined();

  // setTokens() with both undefined clears.
  token.setTokens();
  expect(token.createConfig()).toStrictEqual({});
});
