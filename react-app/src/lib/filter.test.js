import filter from "./filter";

describe("categories", () => {
  test("Default", () =>
    expect(filter.topics()).toStrictEqual([
      "general",
      "time",
      "gear",
      "exposure",
    ]));
});

describe("categories", () => {
  test("Invalid topic", () => expect(filter.categories("")).toStrictEqual([]));
  test("general", () =>
    expect(filter.categories("general")).toStrictEqual(["author", "country"]));
  test("time", () =>
    expect(filter.categories("time")).toStrictEqual([
      "year",
      "year-month",
      "month",
      "weekday",
      "hour",
    ]));
  test("gear", () =>
    expect(filter.categories("gear")).toStrictEqual([
      "camera-make",
      "camera",
      "lens",
      "camera-lens",
    ]));
  test("exposure", () =>
    expect(filter.categories("exposure")).toStrictEqual([
      "focal-length",
      "aperture",
      "exposure-time",
      "iso",
      "ev",
      "lv",
      "resolution",
      "orientation",
    ]));
});

describe("newEmptyTopic", () => {
  test("Empty filters", () =>
    expect(filter.newEmptyTopic({}, "general")).toStrictEqual({ general: {} }));
  test("Different topic exists", () =>
    expect(
      filter.newEmptyTopic(
        { exposure: { aperture: { 2.8: "dummy" } } },
        "general"
      )
    ).toStrictEqual({ exposure: { aperture: { 2.8: "dummy" } }, general: {} }));
  test("Same topic exists", () =>
    expect(
      filter.newEmptyTopic(
        { exposure: { aperture: { 2.8: "dummy" } } },
        "exposure"
      )
    ).toStrictEqual({ exposure: { aperture: { 2.8: "dummy" } } }));
});

describe("removeTopic", () => {
  test("Does not exist", () =>
    expect(filter.removeTopic({}, "exposure")).toStrictEqual({}));
  test("Exists", () =>
    expect(
      filter.removeTopic(
        { exposure: { aperture: { 2.8: "dummy" } } },
        "exposure"
      )
    ).toStrictEqual({}));
  test("Only other exists", () =>
    expect(
      filter.removeTopic(
        { exposure: { aperture: { 2.8: "dummy" } } },
        "general"
      )
    ).toStrictEqual({ exposure: { aperture: { 2.8: "dummy" } } }));
  test("Also other exists", () =>
    expect(
      filter.removeTopic(
        {
          exposure: { aperture: { 2.8: "dummy" } },
          general: { country: { fi: "dummy" } },
        },
        "general"
      )
    ).toStrictEqual({ exposure: { aperture: { 2.8: "dummy" } } }));
});

describe("newEmptyCategory", () => {
  test("Empty filters", () =>
    expect(filter.newEmptyCategory({}, "general", "country")).toStrictEqual({
      general: { country: {} },
    }));
  test("Different category exists", () =>
    expect(
      filter.newEmptyCategory(
        { exposure: { aperture: { 2.8: "dummy" } } },
        "exposure",
        "focal-length"
      )
    ).toStrictEqual({
      exposure: { aperture: { 2.8: "dummy" }, "focal-length": {} },
    }));
  test("Same topic exists", () =>
    expect(
      filter.newEmptyCategory(
        { exposure: { aperture: { 2.8: "dummy" } } },
        "exposure",
        "aperture"
      )
    ).toStrictEqual({ exposure: { aperture: { 2.8: "dummy" } } }));
});

describe("removeCategory", () => {
  test("Topic does not exist", () =>
    expect(filter.removeCategory({}, "exposure", "aperture")).toStrictEqual(
      {}
    ));
  test("Does not exist", () =>
    expect(
      filter.removeCategory({ exposure: {} }, "exposure", "aperture")
    ).toStrictEqual({}));
  test("Exists", () =>
    expect(
      filter.removeCategory(
        { exposure: { aperture: { 2.8: "dummy" } } },
        "exposure",
        "aperture"
      )
    ).toStrictEqual({}));
  test("Only other exists", () =>
    expect(
      filter.removeCategory(
        { exposure: { aperture: { 2.8: "dummy" } } },
        "exposure",
        "focal-length"
      )
    ).toStrictEqual({ exposure: { aperture: { 2.8: "dummy" } } }));
  test("Also other exists", () =>
    expect(
      filter.removeCategory(
        {
          exposure: {
            aperture: { 2.8: "dummy" },
            "focal-length": { 100: "dummy" },
          },
        },
        "exposure",
        "focal-length"
      )
    ).toStrictEqual({ exposure: { aperture: { 2.8: "dummy" } } }));
});

describe("applyNewFilter", () => {
  let mockPhoto;
  beforeEach(() => {
    mockPhoto = { matches: jest.fn() };
  });
  describe("No previous filters", () => {
    test("Empty category", () => {
      const result = filter.applyNewFilter({}, "", "", "unknown");
      expect(result).toEqual({});
    });
    test("Category author", () => {
      const result = filter.applyNewFilter(
        {},
        "general",
        "author",
        "x",
        "unknown"
      );
      expect(typeof result.general.author.x).toBe("function");
      result.general.author.x(mockPhoto);
      expect(mockPhoto.matches).toBeCalled();
      expect(mockPhoto.matches.mock.calls[0][0]).toBe("author");
      expect(mockPhoto.matches.mock.calls[0][1]).toBe("x");
      delete result.general.author.x;
      expect(result).toEqual({ general: { author: {} } });
    });
    test("Category camera", () => {
      const result = filter.applyNewFilter(
        {},
        "gear",
        "camera",
        "x",
        "unknown"
      );
      expect(typeof result.gear.camera.x).toBe("function");
      result.gear.camera.x(mockPhoto);
      expect(mockPhoto.matches).toBeCalled();
      expect(mockPhoto.matches.mock.calls[0][0]).toBe("camera");
      expect(mockPhoto.matches.mock.calls[0][1]).toBe("x");
      delete result.gear.camera.x;
      expect(result).toEqual({ gear: { camera: {} } });
    });
    test("Category camera, unknown", () => {
      const result = filter.applyNewFilter(
        {},
        "gear",
        "camera",
        "unknown",
        "unknown"
      );
      expect(typeof result.gear.camera.unknown).toBe("function");
      result.gear.camera.unknown(mockPhoto);
      expect(mockPhoto.matches).toBeCalled();
      expect(mockPhoto.matches.mock.calls[0][0]).toBe("camera");
      expect(mockPhoto.matches.mock.calls[0][1]).toBe(undefined);
      delete result.gear.camera.unknown;
      expect(result).toEqual({ gear: { camera: {} } });
    });
    test("Category camera-lens", () => {
      const result = filter.applyNewFilter(
        {},
        "gear",
        "camera-lens",
        '["foo","bar"]',
        "unknown"
      );
      expect(typeof result.gear["camera-lens"]['["foo","bar"]']).toBe(
        "function"
      );
      result.gear["camera-lens"]['["foo","bar"]'](mockPhoto);
      expect(mockPhoto.matches).toBeCalled();
      expect(mockPhoto.matches.mock.calls[0][0]).toBe("camera-lens");
      expect(mockPhoto.matches.mock.calls[0][1]).toBe('["foo","bar"]');
      delete result.gear["camera-lens"]['["foo","bar"]'];
      expect(result).toEqual({ gear: { "camera-lens": {} } });
    });
    test("Category camera-lens, unknown", () => {
      const result = filter.applyNewFilter(
        {},
        "gear",
        "camera-lens",
        '["foo","unknown"]',
        "unknown"
      );
      expect(typeof result.gear["camera-lens"]['["foo","unknown"]']).toBe(
        "function"
      );
      result.gear["camera-lens"]['["foo","unknown"]'](mockPhoto);
      expect(mockPhoto.matches).toBeCalled();
      expect(mockPhoto.matches.mock.calls[0][0]).toBe("camera-lens");
      expect(mockPhoto.matches.mock.calls[0][1]).toBe('["foo",null]');
      delete result.gear["camera-lens"]['["foo","unknown"]'];
      expect(result).toEqual({ gear: { "camera-lens": {} } });
    });
  });
  describe("With one previous filter", () => {
    let filters;
    beforeEach(() => {
      filters = { gear: { "focal-length": { 50: "dummy" } } };
    });
    test("Empty topic, category", () => {
      const result = filter.applyNewFilter(filters, "", "", "", "unknown");
      expect(result).toEqual(filters);
    });
    test("Empty  category", () => {
      const result = filter.applyNewFilter(filters, "gear", "", "", "unknown");
      expect(result).toEqual(filters);
    });
    test("Category author", () => {
      const result = filter.applyNewFilter(
        filters,
        "general",
        "author",
        "x",
        "unknown"
      );
      expect(typeof result.general.author.x).toBe("function");
      result.general.author.x(mockPhoto);
      expect(mockPhoto.matches).toBeCalled();
      expect(mockPhoto.matches.mock.calls[0][0]).toBe("author");
      expect(mockPhoto.matches.mock.calls[0][1]).toBe("x");
      delete result.general.author.x;
      expect(result).toEqual({
        gear: { "focal-length": { 50: "dummy" } },
        general: { author: {} },
      });
    });
    test("Category camera", () => {
      const result = filter.applyNewFilter(
        filters,
        "gear",
        "camera",
        "x",
        "unknown"
      );
      expect(typeof result.gear.camera.x).toBe("function");
      result.gear.camera.x(mockPhoto);
      expect(mockPhoto.matches).toBeCalled();
      expect(mockPhoto.matches.mock.calls[0][0]).toBe("camera");
      expect(mockPhoto.matches.mock.calls[0][1]).toBe("x");
      delete result.gear.camera.x;
      expect(result).toEqual({
        gear: { "focal-length": { 50: "dummy" }, camera: {} },
      });
    });
    test("Category focal-length", () => {
      const result = filter.applyNewFilter(
        filters,
        "gear",
        "focal-length",
        "x",
        "unknown"
      );
      expect(typeof result.gear["focal-length"].x).toBe("function");
      result.gear["focal-length"].x(mockPhoto);
      expect(mockPhoto.matches).toBeCalled();
      expect(mockPhoto.matches.mock.calls[0][0]).toBe("focal-length");
      expect(mockPhoto.matches.mock.calls[0][1]).toBe("x");
      delete result.gear["focal-length"].x;
      expect(result).toEqual({ gear: { "focal-length": { 50: "dummy" } } });
    });
    test("Category focal-length, remove previous", () => {
      const result = filter.applyNewFilter(
        filters,
        "gear",
        "focal-length",
        "50",
        "unknown"
      );
      expect(result).toEqual({});
    });
  });
  describe("With previous filters", () => {
    let filters;
    beforeEach(() => {
      filters = {
        exposure: {
          "focal-length": { 50: "dummy", 28: "dummy" },
          aperture: { 2.8: "dummy" },
        },
      };
    });
    test("Empty category", () => {
      const result = filter.applyNewFilter(filters, "", "", "", "unknown");
      expect(result).toEqual(filters);
    });
    test("Category author", () => {
      const result = filter.applyNewFilter(
        filters,
        "general",
        "author",
        "x",
        "unknown"
      );
      expect(typeof result.general.author.x).toBe("function");
      result.general.author.x(mockPhoto);
      expect(mockPhoto.matches).toBeCalled();
      expect(mockPhoto.matches.mock.calls[0][0]).toBe("author");
      expect(mockPhoto.matches.mock.calls[0][1]).toBe("x");
      delete result.general.author.x;
      expect(result).toEqual({
        exposure: {
          "focal-length": { 50: "dummy", 28: "dummy" },
          aperture: { 2.8: "dummy" },
        },
        general: { author: {} },
      });
    });
    test("Category camera", () => {
      const result = filter.applyNewFilter(
        filters,
        "gear",
        "camera",
        "x",
        "unknown"
      );
      expect(typeof result.gear.camera.x).toBe("function");
      result.gear.camera.x(mockPhoto);
      expect(mockPhoto.matches).toBeCalled();
      expect(mockPhoto.matches.mock.calls[0][0]).toBe("camera");
      expect(mockPhoto.matches.mock.calls[0][1]).toBe("x");
      delete result.gear.camera.x;
      expect(result).toEqual({
        exposure: {
          "focal-length": { 50: "dummy", 28: "dummy" },
          aperture: { 2.8: "dummy" },
        },
        gear: { camera: {} },
      });
    });
    test("Category focal-length", () => {
      const result = filter.applyNewFilter(
        filters,
        "exposure",
        "focal-length",
        "x",
        "unknown"
      );
      expect(typeof result.exposure["focal-length"].x).toBe("function");
      result.exposure["focal-length"].x(mockPhoto);
      expect(mockPhoto.matches).toBeCalled();
      expect(mockPhoto.matches.mock.calls[0][0]).toBe("focal-length");
      expect(mockPhoto.matches.mock.calls[0][1]).toBe("x");
      delete result.exposure["focal-length"].x;
      expect(result).toEqual({
        exposure: {
          "focal-length": { 50: "dummy", 28: "dummy" },
          aperture: { 2.8: "dummy" },
        },
      });
    });
    test("Category focal-length, remove previous", () => {
      const result = filter.applyNewFilter(
        filters,
        "exposure",
        "focal-length",
        "50",
        "unknown"
      );
      expect(result).toEqual({
        exposure: {
          "focal-length": { 28: "dummy" },
          aperture: { 2.8: "dummy" },
        },
      });
    });
    test("Category focal-length, remove last in category", () => {
      const result = filter.applyNewFilter(
        filters,
        "exposure",
        "aperture",
        "2.8",
        "unknown"
      );
      expect(result).toEqual({
        exposure: { "focal-length": { 50: "dummy", 28: "dummy" } },
      });
    });
  });
});
