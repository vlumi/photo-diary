import User from "./User";

describe("Construction", () => {
  test("undefined", () => expect(() => User(undefined)).toThrow());
  test("empty", () => expect(() => User({})).toThrow());
  test("no ID", () => expect(() => User({ token: "123" })).toThrow());
  test("ID only", () => {
    const user = User({ id: 42 });
    expect(user.id()).toBe(42);
    expect(user.token()).toBeUndefined();
    expect(user.isAdmin()).toBe(false);
  });
  test("Admin, no token", () => {
    const user = User({ id: 42, isAdmin: true });
    expect(user.id()).toBe(42);
    expect(user.token()).toBeUndefined();
    expect(user.isAdmin()).toBe(true);
    expect(user.toJson()).toBe('{"id":42,"isAdmin":true}');
  });
  test("Separate token", () => {
    const user = User({ id: 42 }, "1234");
    expect(user.id()).toBe(42);
    expect(user.token()).toBe("1234");
    expect(user.isAdmin()).toBe(false);
    expect(user.toJson()).toBe('{"id":42,"token":"1234"}');
  });
  test("Token in object", () => {
    const user = User({ id: 42, token: "1234" });
    expect(user.id()).toBe(42);
    expect(user.token()).toBe("1234");
    expect(user.isAdmin()).toBe(false);
    expect(user.toJson()).toBe('{"id":42,"token":"1234"}');
  });
  test("Two tokens", () => {
    const user = User({ id: 42, token: "1234" }, "5678");
    expect(user.id()).toBe(42);
    expect(user.token()).toBe("5678");
    expect(user.isAdmin()).toBe(false);
    expect(user.toJson()).toBe('{"id":42,"token":"5678"}');
  });
});
