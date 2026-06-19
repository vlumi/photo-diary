import UserModel from "./UserModel";

describe("Construction", () => {
  test("undefined", () => expect(() => UserModel(undefined)).toThrow());
  test("empty", () => expect(() => UserModel({} as any)).toThrow());
  test("ID only", () => {
    const user = UserModel({ id: 42 });
    expect(user.id()).toBe(42);
    expect(user.isAdmin()).toBe(false);
  });
  test("Admin", () => {
    const user = UserModel({ id: 42, isAdmin: true });
    expect(user.id()).toBe(42);
    expect(user.isAdmin()).toBe(true);
    expect(user.toJson()).toBe(
      '{"id":42,"isAdmin":true,"editorGalleries":[]}'
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
  test("Legacy token/refreshToken fields in input are silently dropped", () => {
    const user = UserModel({
      id: 42,
      token: "at",
      refreshToken: "rt",
    } as any);
    expect(user.id()).toBe(42);
    expect(user.toJson()).toBe(
      '{"id":42,"editorGalleries":[]}'
    );
  });
});
