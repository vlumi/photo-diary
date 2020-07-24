const CONST = require("../../utils/constants");
const {
  authorizeView,
  authorizeAdmin,
  authorizeGalleryView,
  authorizeGalleryAdmin,
} = require("../../utils/authorizer")();

const db = require("../../db");
jest.mock("../../db");

const fail = (authorize, user, gallery) => {
  expect.assertions(1);
  return authorize(user, gallery).catch((e) => expect(e).toMatch("Access"));
};

describe("No ACL defined", () => {
  beforeAll(() => {
    db.loadUserAccessControl.mockImplementation((user) => {
      switch (user) {
        default:
          return {};
      }
    });
  });
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
  beforeAll(() => {
    db.loadUserAccessControl.mockImplementation((user) => {
      switch (user) {
        case ":guest":
          return { ":all": CONST.ACCESS_VIEW };
        default:
          return {};
      }
    });
  });
  describe("As :guest", () => {
    test("View", () => authorizeView(":guest"));
    test("Admin", () => fail(authorizeAdmin, ":guest"));
    test("Gallery view", () => authorizeGalleryView(":guest", "gallery"));
    test("Gallery admin", () =>
      fail(authorizeGalleryAdmin, ":guest", "gallery"));
  });
  describe("As user", () => {
    test("View", () => authorizeGalleryView("user", "gallery"));
    test("Admin", () => fail(authorizeAdmin, "user"));
    test("Gallery view", () => authorizeGalleryView("user", "gallery"));
    test("Gallery admin", () => fail(authorizeGalleryAdmin, "user", "gallery"));
  });
});

describe("ACL :guest,:all,ADMIN", () => {
  beforeAll(() => {
    db.loadUserAccessControl.mockImplementation((user) => {
      switch (user) {
        case ":guest":
          return { ":all": CONST.ACCESS_ADMIN };
        default:
          return {};
      }
    });
  });
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

describe("ACL :user,:all,VIEW", () => {
  beforeAll(() => {
    db.loadUserAccessControl.mockImplementation((user) => {
      switch (user) {
        case "user":
          return { ":all": CONST.ACCESS_VIEW };
        default:
          return {};
      }
    });
  });
  describe("As :guest", () => {
    test("View", () => fail(authorizeView, ":guest"));
    test("Admin", () => fail(authorizeAdmin, ":guest"));
    test("Gallery view", () => fail(authorizeGalleryView, ":guest", "gallery"));
    test("Gallery admin", () =>
      fail(authorizeGalleryAdmin, ":guest", "gallery"));
  });
  describe("As user", () => {
    test("View", () => authorizeGalleryView("user", "gallery"));
    test("Admin", () => fail(authorizeAdmin, "user"));
    test("Gallery view", () => authorizeGalleryView("user", "gallery"));
    test("Gallery admin", () => fail(authorizeGalleryAdmin, "user", "gallery"));
  });
});

describe("ACL :user,:all,ADMIN", () => {
  beforeAll(() => {
    db.loadUserAccessControl.mockImplementation((user) => {
      switch (user) {
        case "user":
          return { ":all": CONST.ACCESS_ADMIN };
        default:
          return {};
      }
    });
  });
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

describe("ACL :guest,:all,VIEW, user,:all,ADMIN", () => {
  beforeAll(() => {
    db.loadUserAccessControl.mockImplementation((user) => {
      switch (user) {
        case ":guest":
          return { ":all": CONST.ACCESS_VIEW };
        case "user":
          return { ":all": CONST.ACCESS_ADMIN };
        default:
          return {};
      }
    });
  });
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

describe("ACL :guest,:all,ADMIN, user1,:all,VIEW", () => {
  beforeAll(() => {
    db.loadUserAccessControl.mockImplementation((user) => {
      switch (user) {
        case ":guest":
          return { ":all": CONST.ACCESS_ADMIN };
        case "user1":
          return { ":all": CONST.ACCESS_VIEW };
        default:
          return {};
      }
    });
  });
  describe("As :guest", () => {
    test("View", () => authorizeView(":guest"));
    test("Admin", () => authorizeAdmin(":guest"));
    test("Gallery view", () => authorizeGalleryView(":guest", "gallery"));
    test("Gallery admin", () => authorizeGalleryAdmin(":guest", "gallery"));
  });
  describe("As user1", () => {
    test("View", () => authorizeGalleryView("user1", "gallery"));
    test("Admin", () => fail(authorizeAdmin, "user1"));
    test("Gallery view", () => authorizeGalleryView("user1", "gallery"));
    test("Gallery admin", () =>
      fail(authorizeGalleryAdmin, "user1", "gallery"));
  });
  describe("As user2", () => {
    test("View", () => authorizeView("user2"));
    test("Admin", () => authorizeAdmin("user2"));
    test("Gallery view", () => authorizeGalleryView("user2", "gallery"));
    test("Gallery admin", () => authorizeGalleryAdmin("user2", "gallery"));
  });
});

describe("ACL :guest,:all,ADMIN, user1,:all,NONE", () => {
  beforeAll(() => {
    db.loadUserAccessControl.mockImplementation((user) => {
      switch (user) {
        case ":guest":
          return { ":all": CONST.ACCESS_ADMIN };
        case "user1":
          return { ":all": CONST.ACCESS_NONE };
        default:
          return {};
      }
    });
  });
  describe("As :guest", () => {
    test("View", () => authorizeView(":guest"));
    test("Admin", () => authorizeAdmin(":guest"));
    test("Gallery view", () => authorizeGalleryView(":guest", "gallery"));
    test("Gallery admin", () => authorizeGalleryAdmin(":guest", "gallery"));
  });
  describe("As user1", () => {
    test("View", () => fail(authorizeView, "user1"));
    test("Admin", () => fail(authorizeAdmin, "user1"));
    test("Gallery view", () => fail(authorizeGalleryView, "user1", "gallery"));
    test("Gallery admin", () =>
      fail(authorizeGalleryAdmin, "user1", "gallery"));
  });
  describe("As user2", () => {
    test("View", () => authorizeView("user2"));
    test("Admin", () => authorizeAdmin("user2"));
    test("Gallery view", () => authorizeGalleryView("user2", "gallery"));
    test("Gallery admin", () => authorizeGalleryAdmin("user2", "gallery"));
  });
});

describe("ACL :guest,:all,VIEW, user1,gallery1,ADMIN", () => {
  beforeAll(() => {
    db.loadUserAccessControl.mockImplementation((user) => {
      switch (user) {
        case ":guest":
          return { ":all": CONST.ACCESS_VIEW };
        case "user1":
          return { gallery1: CONST.ACCESS_ADMIN };
        default:
          return {};
      }
    });
  });
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
    test("View", () => authorizeView("user1"));
    test("Admin", () => fail(authorizeAdmin, "user1"));
    test("Gallery1 view", () => authorizeGalleryView("user1", "gallery1"));
    test("Gallery1 admin", () => authorizeGalleryAdmin("user1", "gallery1"));
    test("Gallery2 view", () => authorizeGalleryView("user1", "gallery2"));
    test("Gallery2 admin", () =>
      fail(authorizeGalleryAdmin, "user1", "gallery2"));
  });
  describe("As user2", () => {
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

describe("ACL :guest,:all,NONE,gallery2,VIEW, user1,gallery1,ADMIN", () => {
  beforeAll(() => {
    db.loadUserAccessControl.mockImplementation((user) => {
      switch (user) {
        case ":guest":
          return { ":all": CONST.ACCESS_NONE, gallery2: CONST.ACCESS_VIEW };
        case "user1":
          return { gallery1: CONST.ACCESS_ADMIN };
        default:
          return {};
      }
    });
  });
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
  describe("As user2", () => {
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
