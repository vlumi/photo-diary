import CONST from "../../lib/constants.js";
import authorizerFactory from "../../lib/authorizer.js";
import dbOriginal from "../../db/index.js";

vi.mock("../../db/index.js", () => ({
  default: {
    resolveAccessLevel: vi.fn(),
  },
}));

const db = vi.mocked(dbOriginal);

const {
  authorizeView,
  authorizeAdmin,
  authorizeGalleryView,
  authorizeGalleryAdmin,
} = authorizerFactory();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Authorize = (user: string, gallery?: any) => Promise<unknown>;

const fail = (authorize: Authorize, user: string, gallery?: string) => {
  expect.assertions(1);
  return authorize(user, gallery).catch((e) =>
    expect(e).toBe(CONST.ERROR_ACCESS)
  );
};

// Mock helper: takes a per-user-per-gallery-id ACL config and simulates the
// user-first cascade with :public fall-through. Tests describe what's in the
// DB; the helper resolves the effective level the same way the SQL does.
const setAcl = (
  rows: Record<string, Record<string, number>>
): void => {
  db.resolveAccessLevel.mockImplementation(async (userId, galleryId) => {
    const isSpecial = galleryId.startsWith(":");
    const galleries = isSpecial
      ? [galleryId, ":all"]
      : [galleryId, ":public", ":all"];
    const userRows = rows[userId] ?? {};
    for (const g of galleries) if (g in userRows) return userRows[g];
    const guestRows = rows[":guest"] ?? {};
    for (const g of galleries) if (g in guestRows) return guestRows[g];
    return undefined;
  });
};

describe("No ACL defined", () => {
  beforeAll(() => setAcl({}));
  describe("As :guest", () => {
    test("View", () => fail(authorizeView, ":guest"));
    test("Admin", () => fail(authorizeAdmin, ":guest"));
    test("Gallery view", () => fail(authorizeGalleryView, ":guest", "gallery"));
    test("Gallery admin", () =>
      fail(authorizeGalleryAdmin, ":guest", "gallery"));
  });
  describe("As user", () => {
    test("View", () => fail(authorizeView, "user"));
    test("Admin", () => fail(authorizeAdmin, "user"));
    test("Gallery view", () => fail(authorizeGalleryView, "user", "gallery"));
    test("Gallery admin", () => fail(authorizeGalleryAdmin, "user", "gallery"));
  });
});

describe("ACL :guest,:all,VIEW", () => {
  beforeAll(() => setAcl({ ":guest": { ":all": CONST.ACCESS_VIEW } }));
  describe("As :guest", () => {
    test("View", () => authorizeView(":guest"));
    test("Admin", () => fail(authorizeAdmin, ":guest"));
    test("Gallery view", () => authorizeGalleryView(":guest", "gallery"));
    test("Gallery admin", () =>
      fail(authorizeGalleryAdmin, ":guest", "gallery"));
  });
  describe("As user", () => {
    test("View", () => authorizeView("user"));
    test("Admin", () => fail(authorizeAdmin, "user"));
    test("Gallery view", () => authorizeGalleryView("user", "gallery"));
    test("Gallery admin", () => fail(authorizeGalleryAdmin, "user", "gallery"));
  });
});

describe("ACL :guest,:public,VIEW", () => {
  beforeAll(() => setAcl({ ":guest": { ":public": CONST.ACCESS_VIEW } }));
  describe("As :guest", () => {
    // No :all grant → global view fails. But specific galleries fall through
    // via :public to the view grant.
    test("View", () => fail(authorizeView, ":guest"));
    test("Admin", () => fail(authorizeAdmin, ":guest"));
    test("Gallery view", () => authorizeGalleryView(":guest", "gallery"));
    test("Gallery admin", () =>
      fail(authorizeGalleryAdmin, ":guest", "gallery"));
  });
  describe("As user", () => {
    test("View", () => fail(authorizeView, "user"));
    test("Admin", () => fail(authorizeAdmin, "user"));
    test("Gallery view", () => authorizeGalleryView("user", "gallery"));
    test("Gallery admin", () => fail(authorizeGalleryAdmin, "user", "gallery"));
  });
});

describe("ACL :guest,:all,ADMIN", () => {
  beforeAll(() => setAcl({ ":guest": { ":all": CONST.ACCESS_ADMIN } }));
  describe("As :guest", () => {
    test("View", () => authorizeView(":guest"));
    test("Admin", () => authorizeAdmin(":guest"));
    test("Gallery view", () => authorizeGalleryView(":guest", "gallery"));
    test("Gallery admin", () => authorizeGalleryAdmin(":guest", "gallery"));
  });
  describe("As user", () => {
    test("View", () => authorizeView("user"));
    test("Admin", () => authorizeAdmin("user"));
    test("Gallery view", () => authorizeGalleryView("user", "gallery"));
    test("Gallery admin", () => authorizeGalleryAdmin("user", "gallery"));
  });
});

describe("ACL user,:all,VIEW", () => {
  beforeAll(() => setAcl({ user: { ":all": CONST.ACCESS_VIEW } }));
  describe("As :guest", () => {
    test("View", () => fail(authorizeView, ":guest"));
    test("Admin", () => fail(authorizeAdmin, ":guest"));
    test("Gallery view", () => fail(authorizeGalleryView, ":guest", "gallery"));
    test("Gallery admin", () =>
      fail(authorizeGalleryAdmin, ":guest", "gallery"));
  });
  describe("As user", () => {
    test("View", () => authorizeView("user"));
    test("Admin", () => fail(authorizeAdmin, "user"));
    test("Gallery view", () => authorizeGalleryView("user", "gallery"));
    test("Gallery admin", () => fail(authorizeGalleryAdmin, "user", "gallery"));
  });
});

describe("ACL user,:all,ADMIN", () => {
  beforeAll(() => setAcl({ user: { ":all": CONST.ACCESS_ADMIN } }));
  describe("As :guest", () => {
    test("View", () => fail(authorizeView, ":guest"));
    test("Admin", () => fail(authorizeAdmin, ":guest"));
    test("Gallery view", () => fail(authorizeGalleryView, ":guest", "gallery"));
    test("Gallery admin", () =>
      fail(authorizeGalleryAdmin, ":guest", "gallery"));
  });
  describe("As user", () => {
    test("View", () => authorizeView("user"));
    test("Admin", () => authorizeAdmin("user"));
    test("Gallery view", () => authorizeGalleryView("user", "gallery"));
    test("Gallery admin", () => authorizeGalleryAdmin("user", "gallery"));
  });
});

describe("ACL :guest,:all,VIEW + user,:all,ADMIN", () => {
  beforeAll(() =>
    setAcl({
      ":guest": { ":all": CONST.ACCESS_VIEW },
      user: { ":all": CONST.ACCESS_ADMIN },
    })
  );
  describe("As :guest", () => {
    test("View", () => authorizeView(":guest"));
    test("Admin", () => fail(authorizeAdmin, ":guest"));
    test("Gallery view", () => authorizeGalleryView(":guest", "gallery"));
    test("Gallery admin", () =>
      fail(authorizeGalleryAdmin, ":guest", "gallery"));
  });
  describe("As user", () => {
    test("View", () => authorizeView("user"));
    test("Admin", () => authorizeAdmin("user"));
    test("Gallery view", () => authorizeGalleryView("user", "gallery"));
    test("Gallery admin", () => authorizeGalleryAdmin("user", "gallery"));
  });
});

describe("ACL :guest,:all,ADMIN + user1,:all,VIEW", () => {
  beforeAll(() =>
    setAcl({
      ":guest": { ":all": CONST.ACCESS_ADMIN },
      user1: { ":all": CONST.ACCESS_VIEW },
    })
  );
  describe("As :guest", () => {
    test("View", () => authorizeView(":guest"));
    test("Admin", () => authorizeAdmin(":guest"));
    test("Gallery view", () => authorizeGalleryView(":guest", "gallery"));
    test("Gallery admin", () => authorizeGalleryAdmin(":guest", "gallery"));
  });
  describe("As user1 (explicit row beats guest)", () => {
    test("View", () => authorizeView("user1"));
    test("Admin", () => fail(authorizeAdmin, "user1"));
    test("Gallery view", () => authorizeGalleryView("user1", "gallery"));
    test("Gallery admin", () =>
      fail(authorizeGalleryAdmin, "user1", "gallery"));
  });
  describe("As user2 (no row, inherits guest)", () => {
    test("View", () => authorizeView("user2"));
    test("Admin", () => authorizeAdmin("user2"));
    test("Gallery view", () => authorizeGalleryView("user2", "gallery"));
    test("Gallery admin", () => authorizeGalleryAdmin("user2", "gallery"));
  });
});

describe("ACL :guest,:all,ADMIN + user1,:all,NONE (explicit deny)", () => {
  beforeAll(() =>
    setAcl({
      ":guest": { ":all": CONST.ACCESS_ADMIN },
      user1: { ":all": CONST.ACCESS_NONE },
    })
  );
  describe("As :guest", () => {
    test("View", () => authorizeView(":guest"));
    test("Admin", () => authorizeAdmin(":guest"));
    test("Gallery view", () => authorizeGalleryView(":guest", "gallery"));
    test("Gallery admin", () => authorizeGalleryAdmin(":guest", "gallery"));
  });
  describe("As user1 (denied even though :guest is admin)", () => {
    test("View", () => fail(authorizeView, "user1"));
    test("Admin", () => fail(authorizeAdmin, "user1"));
    test("Gallery view", () => fail(authorizeGalleryView, "user1", "gallery"));
    test("Gallery admin", () =>
      fail(authorizeGalleryAdmin, "user1", "gallery"));
  });
  describe("As user2 (no row, inherits guest)", () => {
    test("View", () => authorizeView("user2"));
    test("Admin", () => authorizeAdmin("user2"));
    test("Gallery view", () => authorizeGalleryView("user2", "gallery"));
    test("Gallery admin", () => authorizeGalleryAdmin("user2", "gallery"));
  });
});

describe("ACL :guest,:all,VIEW + user1,gallery1,ADMIN", () => {
  beforeAll(() =>
    setAcl({
      ":guest": { ":all": CONST.ACCESS_VIEW },
      user1: { gallery1: CONST.ACCESS_ADMIN },
    })
  );
  describe("As :guest", () => {
    test("View", () => authorizeView(":guest"));
    test("Admin", () => fail(authorizeAdmin, ":guest"));
    test("Gallery1 view", () => authorizeGalleryView(":guest", "gallery1"));
    test("Gallery1 admin", () =>
      fail(authorizeGalleryAdmin, ":guest", "gallery1"));
    test("Gallery2 view", () => authorizeGalleryView(":guest", "gallery2"));
    test("Gallery2 admin", () =>
      fail(authorizeGalleryAdmin, ":guest", "gallery2"));
  });
  describe("As user1", () => {
    // user1 has gallery1=ADMIN, no :all row. Global view falls back to
    // (:guest, :all)=VIEW. Other galleries fall back to guest's :all too.
    test("View", () => authorizeView("user1"));
    test("Admin", () => fail(authorizeAdmin, "user1"));
    test("Gallery1 view", () => authorizeGalleryView("user1", "gallery1"));
    test("Gallery1 admin", () => authorizeGalleryAdmin("user1", "gallery1"));
    test("Gallery2 view", () => authorizeGalleryView("user1", "gallery2"));
    test("Gallery2 admin", () =>
      fail(authorizeGalleryAdmin, "user1", "gallery2"));
  });
  describe("As user2 (no row, inherits guest)", () => {
    test("View", () => authorizeView("user2"));
    test("Admin", () => fail(authorizeAdmin, "user2"));
    test("Gallery1 view", () => authorizeGalleryView("user2", "gallery1"));
    test("Gallery1 admin", () =>
      fail(authorizeGalleryAdmin, "user2", "gallery1"));
    test("Gallery2 view", () => authorizeGalleryView("user2", "gallery2"));
    test("Gallery2 admin", () =>
      fail(authorizeGalleryAdmin, "user2", "gallery2"));
  });
});

describe("ACL :guest,:all,NONE + :guest,gallery2,VIEW + user1,gallery1,ADMIN", () => {
  beforeAll(() =>
    setAcl({
      ":guest": { ":all": CONST.ACCESS_NONE, gallery2: CONST.ACCESS_VIEW },
      user1: { gallery1: CONST.ACCESS_ADMIN },
    })
  );
  describe("As :guest", () => {
    test("View", () => fail(authorizeView, ":guest"));
    test("Admin", () => fail(authorizeAdmin, ":guest"));
    test("Gallery1 view", () =>
      fail(authorizeGalleryView, ":guest", "gallery1"));
    test("Gallery1 admin", () =>
      fail(authorizeGalleryAdmin, ":guest", "gallery1"));
    test("Gallery2 view", () => authorizeGalleryView(":guest", "gallery2"));
    test("Gallery2 admin", () =>
      fail(authorizeGalleryAdmin, ":guest", "gallery2"));
  });
  describe("As user1", () => {
    test("View", () => fail(authorizeView, "user1"));
    test("Admin", () => fail(authorizeAdmin, "user1"));
    test("Gallery1 view", () => authorizeGalleryView("user1", "gallery1"));
    test("Gallery1 admin", () => authorizeGalleryAdmin("user1", "gallery1"));
    test("Gallery2 view", () => authorizeGalleryView("user1", "gallery2"));
    test("Gallery2 admin", () =>
      fail(authorizeGalleryAdmin, "user1", "gallery2"));
  });
  describe("As user2 (no row, inherits guest's deny)", () => {
    test("View", () => fail(authorizeView, "user2"));
    test("Admin", () => fail(authorizeAdmin, "user2"));
    test("Gallery1 view", () =>
      fail(authorizeGalleryView, "user2", "gallery1"));
    test("Gallery1 admin", () =>
      fail(authorizeGalleryAdmin, "user2", "gallery1"));
    test("Gallery2 view", () => authorizeGalleryView("user2", "gallery2"));
    test("Gallery2 admin", () =>
      fail(authorizeGalleryAdmin, "user2", "gallery2"));
  });
});

describe("User-first cascade: user,:all,ADMIN beats :guest,:public,VIEW", () => {
  // The motivating case for switching to user-first: an admin with a global
  // grant should keep admin level on specific galleries, even when :guest has
  // a more-gallery-specific :public row that would have won under gallery-first.
  beforeAll(() =>
    setAcl({
      ":guest": { ":public": CONST.ACCESS_VIEW },
      admin: { ":all": CONST.ACCESS_ADMIN },
    })
  );
  describe("As admin", () => {
    test("View (global)", () => authorizeView("admin"));
    test("Admin (global)", () => authorizeAdmin("admin"));
    test("Gallery view", () => authorizeGalleryView("admin", "dailybw"));
    // Critical: admin's :all=ADMIN wins over :guest's :public=VIEW for specific galleries.
    test("Gallery admin", () => authorizeGalleryAdmin("admin", "dailybw"));
  });
  describe("As :guest", () => {
    test("View (global)", () => fail(authorizeView, ":guest"));
    test("Gallery view via :public fall-through", () =>
      authorizeGalleryView(":guest", "dailybw"));
    test("Gallery admin denied", () =>
      fail(authorizeGalleryAdmin, ":guest", "dailybw"));
  });
});
