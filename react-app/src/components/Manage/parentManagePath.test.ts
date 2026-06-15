import { describe, expect, test } from "vitest";

import { parentManagePath } from "./index";

describe("parentManagePath", () => {
  test("nested edit pages strip the last segment", () => {
    expect(parentManagePath("/m/users/alice")).toBe("/m/users");
    expect(parentManagePath("/m/groups/staff")).toBe("/m/groups");
    expect(parentManagePath("/m/photos/img.jpg")).toBe("/m/photos");
    expect(parentManagePath("/m/galleries/new")).toBe("/m/galleries");
    expect(parentManagePath("/m/users/new")).toBe("/m/users");
    expect(parentManagePath("/m/groups/new")).toBe("/m/groups");
  });

  test("/m/g/<id> maps to /m/galleries (asymmetric route shape)", () => {
    expect(parentManagePath("/m/g/dailybw")).toBe("/m/galleries");
    expect(parentManagePath("/m/g/abc-123")).toBe("/m/galleries");
  });

  test("/m/g/<id>/access skips the modal level back to /m/galleries", () => {
    expect(parentManagePath("/m/g/abc/access")).toBe("/m/galleries");
  });

  test("first-level pages go to /m", () => {
    expect(parentManagePath("/m/galleries")).toBe("/m");
    expect(parentManagePath("/m/users")).toBe("/m");
    expect(parentManagePath("/m/groups")).toBe("/m");
    expect(parentManagePath("/m/access")).toBe("/m");
    expect(parentManagePath("/m/photos")).toBe("/m");
    expect(parentManagePath("/m/instance")).toBe("/m");
  });

  test("/m and non-/m paths are no-ops", () => {
    expect(parentManagePath("/m")).toBe(null);
    expect(parentManagePath("/m/")).toBe(null);
    expect(parentManagePath("/g/dailybw")).toBe(null);
    expect(parentManagePath("/")).toBe(null);
    expect(parentManagePath("")).toBe(null);
  });

  test("trailing slash is normalised", () => {
    expect(parentManagePath("/m/galleries/")).toBe("/m");
    expect(parentManagePath("/m/g/abc/")).toBe("/m/galleries");
    expect(parentManagePath("/m/g/abc/access/")).toBe("/m/galleries");
  });
});
