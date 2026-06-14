import authorizerFactory from "../../lib/authorizer.js";
import { AccessError, NotFoundError } from "../../lib/errors.js";
import dbOriginal from "../../db/index.js";

vi.mock("../../db/index.js", () => ({
  default: {
    resolveAccessLevel: vi.fn(),
    loadUser: vi.fn(),
  },
}));

const db = vi.mocked(dbOriginal);

const {
  authorizeView,
  authorizeAdmin,
  authorizeGalleryView,
  authorizeGalleryEditor,
} = authorizerFactory();

type Authorize = (user: string, gallery?: any) => Promise<unknown>;

const fail = (authorize: Authorize, user: string, gallery?: string) => {
  expect.assertions(1);
  return authorize(user, gallery).catch((e) =>
    expect(e).toBeInstanceOf(AccessError)
  );
};

// The authorizer reads two things —
//   - user.is_admin (via db.loadUser) for the global-admin bypass
//   - resolveAccessLevel(userId, galleryId) → { hasAccess, isEditor } for
//     gallery-scoped checks
// The mock keeps a per-test ACL and answers both queries from it.
const setup = (
  globalAdmins: string[],
  perGallery: Record<
    string,
    Record<string, { isEditor: boolean; canSeePrivate?: boolean }>
  >
): void => {
  db.loadUser.mockImplementation(async (userId) => {
    const base = { name: "", password: "", secret: "" };
    if (userId === ":guest") return { ...base, id: ":guest", is_admin: 0 };
    return {
      ...base,
      id: userId,
      is_admin: globalAdmins.includes(userId) ? 1 : 0,
    };
  });
  db.resolveAccessLevel.mockImplementation(async (userId, galleryId) => {
    if (globalAdmins.includes(userId)) {
      return { hasAccess: true, isEditor: true, canSeePrivate: true };
    }
    const userRow = perGallery[userId]?.[galleryId];
    const guestRow = perGallery[":guest"]?.[galleryId];
    if (!userRow && !guestRow)
      return { hasAccess: false, isEditor: false, canSeePrivate: false };
    const isEditor = !!(userRow?.isEditor || guestRow?.isEditor);
    const canSeePrivate =
      isEditor ||
      !!(userRow?.canSeePrivate || guestRow?.canSeePrivate);
    return { hasAccess: true, isEditor, canSeePrivate };
  });
};

describe("No grants", () => {
  beforeAll(() => setup([], {}));
  describe("As :guest", () => {
    test("View (admin-only)", () => fail(authorizeView, ":guest"));
    test("Admin", () => fail(authorizeAdmin, ":guest"));
    test("Gallery view", () => fail(authorizeGalleryView, ":guest", "gallery"));
    test("Gallery admin", () => fail(authorizeGalleryEditor, ":guest", "gallery"));
  });
  describe("As user", () => {
    test("View (admin-only)", () => fail(authorizeView, "user"));
    test("Admin", () => fail(authorizeAdmin, "user"));
    test("Gallery view", () => fail(authorizeGalleryView, "user", "gallery"));
    test("Gallery admin", () => fail(authorizeGalleryEditor, "user", "gallery"));
  });
});

describe("user.is_admin bypass", () => {
  beforeAll(() => setup(["admin"], {}));
  describe("As admin (global)", () => {
    test("View", () => authorizeView("admin"));
    test("Admin", () => authorizeAdmin("admin"));
    test("Gallery view (any)", () =>
      authorizeGalleryView("admin", "any-gallery"));
    test("Gallery admin (any)", () =>
      authorizeGalleryEditor("admin", "any-gallery"));
  });
  describe("As non-admin", () => {
    test("View denied", () => fail(authorizeView, "other"));
    test("Admin denied", () => fail(authorizeAdmin, "other"));
    test("Gallery view denied", () =>
      fail(authorizeGalleryView, "other", "any"));
  });
});

describe("Per-gallery view grant", () => {
  beforeAll(() => setup([], { user: { gallery1: { isEditor: false } } }));
  describe("As user", () => {
    test("View (no global)", () => fail(authorizeView, "user"));
    test("Admin (no global)", () => fail(authorizeAdmin, "user"));
    test("Gallery1 view", () => authorizeGalleryView("user", "gallery1"));
    test("Gallery1 admin denied", () =>
      fail(authorizeGalleryEditor, "user", "gallery1"));
    test("Gallery2 view denied", () =>
      fail(authorizeGalleryView, "user", "gallery2"));
  });
});

describe("Per-gallery admin grant", () => {
  beforeAll(() => setup([], { user: { gallery1: { isEditor: true } } }));
  describe("As user", () => {
    test("Global view denied", () => fail(authorizeView, "user"));
    test("Gallery1 view", () => authorizeGalleryView("user", "gallery1"));
    test("Gallery1 admin", () => authorizeGalleryEditor("user", "gallery1"));
    test("Gallery2 view denied", () =>
      fail(authorizeGalleryView, "user", "gallery2"));
  });
});

describe(":guest grant falls through to logged-in users without a row", () => {
  beforeAll(() =>
    setup([], { ":guest": { gallery3: { isEditor: false } } })
  );
  describe("As :guest", () => {
    test("Gallery3 view", () => authorizeGalleryView(":guest", "gallery3"));
    test("Gallery1 view denied", () =>
      fail(authorizeGalleryView, ":guest", "gallery1"));
  });
  describe("As user (no own row, inherits :guest)", () => {
    test("Gallery3 view", () => authorizeGalleryView("user", "gallery3"));
    test("Gallery1 view denied", () =>
      fail(authorizeGalleryView, "user", "gallery1"));
  });
});

describe("Global admin missing user is denied (not 500)", () => {
  beforeAll(() => {
    db.loadUser.mockImplementation(async () => {
      throw new NotFoundError();
    });
    db.resolveAccessLevel.mockResolvedValue({
      hasAccess: false,
      isEditor: false,
      canSeePrivate: false,
    });
  });
  test("authorizeAdmin throws AccessError on missing user", () =>
    fail(authorizeAdmin, "ghost"));
});
