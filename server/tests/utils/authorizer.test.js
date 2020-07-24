const CONST = require("../../utils/constants");
const {
  authorizeView,
  authorizeAdmin,
  authorizeGalleryView,
  authorizeGalleryAdmin,
} = require("../../utils/authorizer")();

const db = require("../../db");
jest.mock("../../db");

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
    test("Authorize view", () => {
      expect.assertions(1);
      return authorizeView(":guest").catch((e) => expect(e).toMatch("Access"));
    });
    test("Authorize admin", () => {
      expect.assertions(1);
      return authorizeAdmin(":guest").catch((e) => expect(e).toMatch("Access"));
    });
    test("Authorize gallery view", () => {
      expect.assertions(1);
      return authorizeGalleryView(":guest", "gallery").catch((e) =>
        expect(e).toMatch("Access")
      );
    });
    test("Authorize gallery admin", () => {
      expect.assertions(1);
      return authorizeGalleryAdmin(":guest", "gallery").catch((e) =>
        expect(e).toMatch("Access")
      );
    });
  });
  describe("As user", () => {
    test("Authorize view", () => {
      expect.assertions(1);
      return authorizeView("user").catch((e) => expect(e).toMatch("Access"));
    });
    test("Authorize admin", () => {
      expect.assertions(1);
      return authorizeAdmin("user").catch((e) => expect(e).toMatch("Access"));
    });
    test("Authorize gallery view", () => {
      expect.assertions(1);
      return authorizeGalleryView("user", "gallery").catch((e) =>
        expect(e).toMatch("Access")
      );
    });
    test("Authorize gallery admin", () => {
      expect.assertions(1);
      return authorizeGalleryAdmin("user", "gallery").catch((e) =>
        expect(e).toMatch("Access")
      );
    });
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
    test("Authorize view", () => {
      return authorizeView(":guest");
    });
    test("Authorize admin", () => {
      expect.assertions(1);
      return authorizeAdmin(":guest").catch((e) => expect(e).toMatch("Access"));
    });
    test("Authorize gallery view", () => {
      return authorizeGalleryView(":guest", "gallery");
    });
    test("Authorize gallery admin", () => {
      expect.assertions(1);
      return authorizeGalleryAdmin(":guest", "gallery").catch((e) =>
        expect(e).toMatch("Access")
      );
    });
  });
  describe("As user", () => {
    test("Authorize view", () => {
      return authorizeView("user");
    });
    test("Authorize admin", () => {
      expect.assertions(1);
      return authorizeAdmin("user").catch((e) => expect(e).toMatch("Access"));
    });
    test("Authorize gallery view", () => {
      return authorizeGalleryView("user", "gallery");
    });
    test("Authorize gallery admin", () => {
      expect.assertions(1);
      return authorizeGalleryAdmin("user", "gallery").catch((e) =>
        expect(e).toMatch("Access")
      );
    });
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
    test("Authorize view", () => {
      return authorizeView(":guest");
    });
    test("Authorize admin", () => {
      return authorizeAdmin(":guest");
    });
    test("Authorize gallery view", () => {
      return authorizeGalleryView(":guest", "gallery");
    });
    test("Authorize gallery admin", () => {
      return authorizeGalleryAdmin(":guest", "gallery");
    });
  });
  describe("As user", () => {
    test("Authorize view", () => {
      return authorizeView("user");
    });
    test("Authorize admin", () => {
      return authorizeAdmin("user");
    });
    test("Authorize gallery view", () => {
      return authorizeGalleryView("user", "gallery");
    });
    test("Authorize gallery admin", () => {
      return authorizeGalleryAdmin("user", "gallery");
    });
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
    test("Authorize view", () => {
      expect.assertions(1);
      return authorizeView(":guest").catch((e) => expect(e).toMatch("Access"));
    });
    test("Authorize admin", () => {
      expect.assertions(1);
      return authorizeAdmin(":guest").catch((e) => expect(e).toMatch("Access"));
    });
    test("Authorize gallery view", () => {
      expect.assertions(1);
      return authorizeGalleryView(":guest", "gallery").catch((e) =>
        expect(e).toMatch("Access")
      );
    });
    test("Authorize gallery admin", () => {
      expect.assertions(1);
      return authorizeGalleryAdmin(":guest", "gallery").catch((e) =>
        expect(e).toMatch("Access")
      );
    });
  });
  describe("As user", () => {
    test("Authorize view", () => {
      return authorizeView("user");
    });
    test("Authorize admin", () => {
      expect.assertions(1);
      return authorizeAdmin("user").catch((e) => expect(e).toMatch("Access"));
    });
    test("Authorize gallery view", () => {
      return authorizeGalleryView("user", "gallery");
    });
    test("Authorize gallery admin", () => {
      expect.assertions(1);
      return authorizeGalleryAdmin("user", "gallery").catch((e) =>
        expect(e).toMatch("Access")
      );
    });
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
    test("Authorize view", () => {
      expect.assertions(1);
      return authorizeView(":guest").catch((e) => expect(e).toMatch("Access"));
    });
    test("Authorize admin", () => {
      expect.assertions(1);
      return authorizeAdmin(":guest").catch((e) => expect(e).toMatch("Access"));
    });
    test("Authorize gallery view", () => {
      expect.assertions(1);
      return authorizeGalleryView(":guest", "gallery").catch((e) =>
        expect(e).toMatch("Access")
      );
    });
    test("Authorize gallery admin", () => {
      expect.assertions(1);
      return authorizeGalleryAdmin(":guest", "gallery").catch((e) =>
        expect(e).toMatch("Access")
      );
    });
  });
  describe("As user", () => {
    test("Authorize view", () => {
      return authorizeView("user");
    });
    test("Authorize admin", () => {
      return authorizeAdmin("user");
    });
    test("Authorize gallery view", () => {
      return authorizeGalleryView("user", "gallery");
    });
    test("Authorize gallery admin", () => {
      return authorizeGalleryAdmin("user", "gallery");
    });
  });
});
