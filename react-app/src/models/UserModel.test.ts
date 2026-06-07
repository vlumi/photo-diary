import UserModel from "./UserModel";

describe("Construction", () => {
  test("undefined", () => expect(() => UserModel(undefined)).toThrow());
  test("empty", () => expect(() => UserModel({} as any)).toThrow());
  test("no ID", () =>
    expect(() => UserModel({ token: "123" } as any)).toThrow());
  test("ID only", () => {
    const user = UserModel({ id: 42 });
    expect(user.id()).toBe(42);
    expect(user.token()).toBeUndefined();
    expect(user.isAdmin()).toBe(false);
  });
  test("Admin, no token", () => {
    const user = UserModel({ id: 42, isAdmin: true });
    expect(user.id()).toBe(42);
    expect(user.token()).toBeUndefined();
    expect(user.isAdmin()).toBe(true);
    expect(user.toJson()).toBe(
      '{"id":42,"isAdmin":true,"editorGalleries":[]}'
    );
  });
  test("Separate token", () => {
    const user = UserModel({ id: 42 }, "1234");
    expect(user.id()).toBe(42);
    expect(user.token()).toBe("1234");
    expect(user.isAdmin()).toBe(false);
    expect(user.toJson()).toBe(
      '{"id":42,"token":"1234","editorGalleries":[]}'
    );
  });
  test("Token in object", () => {
    const user = UserModel({ id: 42, token: "1234" });
    expect(user.id()).toBe(42);
    expect(user.token()).toBe("1234");
    expect(user.isAdmin()).toBe(false);
    expect(user.toJson()).toBe(
      '{"id":42,"token":"1234","editorGalleries":[]}'
    );
  });
  test("Two tokens", () => {
    const user = UserModel({ id: 42, token: "1234" }, "5678");
    expect(user.id()).toBe(42);
    expect(user.token()).toBe("5678");
    expect(user.isAdmin()).toBe(false);
    expect(user.toJson()).toBe(
      '{"id":42,"token":"5678","editorGalleries":[]}'
    );
  });
  test("Editor galleries", () => {
    const user = UserModel({
      id: 42,
      editorGalleries: ["g1", "g2"],
    });
    expect(user.editorGalleries()).toEqual(["g1", "g2"]);
    expect(user.isGalleryEditor("g1")).toBe(true);
    expect(user.isGalleryEditor("g3")).toBe(false);
  });
  test("Global admin satisfies isGalleryEditor for any gallery", () => {
    const user = UserModel({ id: 42, isAdmin: true });
    expect(user.isGalleryEditor("any-gallery")).toBe(true);
  });
});
