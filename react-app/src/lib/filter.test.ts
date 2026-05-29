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
    expect(filter.categories("general")).toStrictEqual([
      "author",
      "country",
      "state",
      "city",
      "geotagged",
    ]));
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
      "aspect-ratio",
    ]));
});

describe("newEmptyTopic", () => {
  test("Empty filters", () =>
    expect(filter.newEmptyTopic({}, "general")).toStrictEqual({ general: {} }));
  test("Different topic exists", () =>
    expect(
      filter.newEmptyTopic(
        { exposure: { aperture: { 2.8: ("dummy" as any) } } },
        "general"
      )
    ).toStrictEqual({ exposure: { aperture: { 2.8: ("dummy" as any) } }, general: {} }));
  test("Same topic exists", () =>
    expect(
      filter.newEmptyTopic(
        { exposure: { aperture: { 2.8: ("dummy" as any) } } },
        "exposure"
      )
    ).toStrictEqual({ exposure: { aperture: { 2.8: ("dummy" as any) } } }));
});

describe("removeTopic", () => {
  test("Does not exist", () =>
    expect(filter.removeTopic({}, "exposure")).toStrictEqual({}));
  test("Exists", () =>
    expect(
      filter.removeTopic(
        { exposure: { aperture: { 2.8: ("dummy" as any) } } },
        "exposure"
      )
    ).toStrictEqual({}));
  test("Only other exists", () =>
    expect(
      filter.removeTopic(
        { exposure: { aperture: { 2.8: ("dummy" as any) } } },
        "general"
      )
    ).toStrictEqual({ exposure: { aperture: { 2.8: ("dummy" as any) } } }));
  test("Also other exists", () =>
    expect(
      filter.removeTopic(
        {
          exposure: { aperture: { 2.8: ("dummy" as any) } },
          general: { country: { fi: ("dummy" as any) } },
        },
        "general"
      )
    ).toStrictEqual({ exposure: { aperture: { 2.8: ("dummy" as any) } } }));
});

describe("newEmptyCategory", () => {
  test("Empty filters", () =>
    expect(filter.newEmptyCategory({}, "general", "country")).toStrictEqual({
      general: { country: {} },
    }));
  test("Different category exists", () =>
    expect(
      filter.newEmptyCategory(
        { exposure: { aperture: { 2.8: ("dummy" as any) } } },
        "exposure",
        "focal-length"
      )
    ).toStrictEqual({
      exposure: { aperture: { 2.8: ("dummy" as any) }, "focal-length": {} },
    }));
  test("Same topic exists", () =>
    expect(
      filter.newEmptyCategory(
        { exposure: { aperture: { 2.8: ("dummy" as any) } } },
        "exposure",
        "aperture"
      )
    ).toStrictEqual({ exposure: { aperture: { 2.8: ("dummy" as any) } } }));
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
        { exposure: { aperture: { 2.8: ("dummy" as any) } } },
        "exposure",
        "aperture"
      )
    ).toStrictEqual({}));
  test("Only other exists", () =>
    expect(
      filter.removeCategory(
        { exposure: { aperture: { 2.8: ("dummy" as any) } } },
        "exposure",
        "focal-length"
      )
    ).toStrictEqual({ exposure: { aperture: { 2.8: ("dummy" as any) } } }));
  test("Also other exists", () =>
    expect(
      filter.removeCategory(
        {
          exposure: {
            aperture: { 2.8: ("dummy" as any) },
            "focal-length": { 100: ("dummy" as any) },
          },
        },
        "exposure",
        "focal-length"
      )
    ).toStrictEqual({ exposure: { aperture: { 2.8: ("dummy" as any) } } }));
});

describe("applyNewFilter", () => {
  let mockPhoto: any;
  beforeEach(() => {
    mockPhoto = { matches: vi.fn() };
  });
  describe("No previous filters", () => {
    test("Empty category", () => {
      const result = filter.applyNewFilter({}, "", "", "unknown", "unknown");
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
    let filters: any;
    beforeEach(() => {
      filters = { gear: { "focal-length": { 50: ("dummy" as any) } } };
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
        gear: { "focal-length": { 50: ("dummy" as any) } },
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
        gear: { "focal-length": { 50: ("dummy" as any) }, camera: {} },
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
      expect(result).toEqual({ gear: { "focal-length": { 50: ("dummy" as any) } } });
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
    let filters: any;
    beforeEach(() => {
      filters = {
        exposure: {
          "focal-length": { 50: ("dummy" as any), 28: ("dummy" as any) },
          aperture: { 2.8: ("dummy" as any) },
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
          "focal-length": { 50: ("dummy" as any), 28: ("dummy" as any) },
          aperture: { 2.8: ("dummy" as any) },
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
          "focal-length": { 50: ("dummy" as any), 28: ("dummy" as any) },
          aperture: { 2.8: ("dummy" as any) },
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
          "focal-length": { 50: ("dummy" as any), 28: ("dummy" as any) },
          aperture: { 2.8: ("dummy" as any) },
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
          "focal-length": { 28: ("dummy" as any) },
          aperture: { 2.8: ("dummy" as any) },
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
        exposure: { "focal-length": { 50: ("dummy" as any), 28: ("dummy" as any) } },
      });
    });
  });
});
