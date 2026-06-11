import filter from "./filter";

describe("categories", () => {
  test("Default", () =>
    expect(filter.topics()).toStrictEqual([
      "general",
      "time",
      "gear",
      "settings",
      "image",
      "light",
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
      "date-range",
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
  test("settings", () =>
    expect(filter.categories("settings")).toStrictEqual([
      "focal-length",
      "focal-length-eq",
      "aperture",
      "exposure-time",
      "iso",
    ]));
  test("image", () =>
    expect(filter.categories("image")).toStrictEqual([
      "resolution",
      "aspect-ratio",
      "orientation",
    ]));
  test("light", () =>
    expect(filter.categories("light")).toStrictEqual(["ev", "lv"]));
});

describe("newEmptyTopic", () => {
  test("Empty filters", () =>
    expect(filter.newEmptyTopic({}, "general")).toStrictEqual({ general: {} }));
  test("Different topic exists", () =>
    expect(
      filter.newEmptyTopic(
        { settings: { aperture: { 2.8: ("dummy" as any) } } },
        "general"
      )
    ).toStrictEqual({ settings: { aperture: { 2.8: ("dummy" as any) } }, general: {} }));
  test("Same topic exists", () =>
    expect(
      filter.newEmptyTopic(
        { settings: { aperture: { 2.8: ("dummy" as any) } } },
        "settings"
      )
    ).toStrictEqual({ settings: { aperture: { 2.8: ("dummy" as any) } } }));
});

describe("removeTopic", () => {
  test("Does not exist", () =>
    expect(filter.removeTopic({}, "settings")).toStrictEqual({}));
  test("Exists", () =>
    expect(
      filter.removeTopic(
        { settings: { aperture: { 2.8: ("dummy" as any) } } },
        "settings"
      )
    ).toStrictEqual({}));
  test("Only other exists", () =>
    expect(
      filter.removeTopic(
        { settings: { aperture: { 2.8: ("dummy" as any) } } },
        "general"
      )
    ).toStrictEqual({ settings: { aperture: { 2.8: ("dummy" as any) } } }));
  test("Also other exists", () =>
    expect(
      filter.removeTopic(
        {
          settings: { aperture: { 2.8: ("dummy" as any) } },
          general: { country: { fi: ("dummy" as any) } },
        },
        "general"
      )
    ).toStrictEqual({ settings: { aperture: { 2.8: ("dummy" as any) } } }));
});

describe("newEmptyCategory", () => {
  test("Empty filters", () =>
    expect(filter.newEmptyCategory({}, "general", "country")).toStrictEqual({
      general: { country: {} },
    }));
  test("Different category exists", () =>
    expect(
      filter.newEmptyCategory(
        { settings: { aperture: { 2.8: ("dummy" as any) } } },
        "settings",
        "focal-length"
      )
    ).toStrictEqual({
      settings: { aperture: { 2.8: ("dummy" as any) }, "focal-length": {} },
    }));
  test("Same topic exists", () =>
    expect(
      filter.newEmptyCategory(
        { settings: { aperture: { 2.8: ("dummy" as any) } } },
        "settings",
        "aperture"
      )
    ).toStrictEqual({ settings: { aperture: { 2.8: ("dummy" as any) } } }));
});

describe("removeCategory", () => {
  test("Topic does not exist", () =>
    expect(filter.removeCategory({}, "settings", "aperture")).toStrictEqual(
      {}
    ));
  test("Does not exist", () =>
    expect(
      filter.removeCategory({ settings: {} }, "settings", "aperture")
    ).toStrictEqual({}));
  test("Exists", () =>
    expect(
      filter.removeCategory(
        { settings: { aperture: { 2.8: ("dummy" as any) } } },
        "settings",
        "aperture"
      )
    ).toStrictEqual({}));
  test("Only other exists", () =>
    expect(
      filter.removeCategory(
        { settings: { aperture: { 2.8: ("dummy" as any) } } },
        "settings",
        "focal-length"
      )
    ).toStrictEqual({ settings: { aperture: { 2.8: ("dummy" as any) } } }));
  test("Also other exists", () =>
    expect(
      filter.removeCategory(
        {
          settings: {
            aperture: { 2.8: ("dummy" as any) },
            "focal-length": { 100: ("dummy" as any) },
          },
        },
        "settings",
        "focal-length"
      )
    ).toStrictEqual({ settings: { aperture: { 2.8: ("dummy" as any) } } }));
});

describe("toServerFilters", () => {
  const noop = () => true;
  test("empty filters → empty object", () => {
    expect(filter.toServerFilters({})).toEqual({});
  });
  test("extracts keys per topic / category", () => {
    const filters = {
      general: {
        author: { Alice: noop, Bob: noop },
        country: { jp: noop },
      },
      time: { year: { "2024": noop } },
    };
    expect(filter.toServerFilters(filters)).toEqual({
      general: { author: ["Alice", "Bob"], country: ["jp"] },
      time: { year: ["2024"] },
    });
  });
  test("'unknown' key serialises to null", () => {
    const filters = { general: { country: { unknown: noop, jp: noop } } };
    expect(filter.toServerFilters(filters)).toEqual({
      general: { country: [null, "jp"] },
    });
  });
  test("empty inner key record drops the category", () => {
    const filters = {
      general: { author: {}, country: { jp: noop } },
    };
    expect(filter.toServerFilters(filters)).toEqual({
      general: { country: ["jp"] },
    });
  });
  test("topic with all-empty categories drops the topic", () => {
    expect(filter.toServerFilters({ general: { author: {} } })).toEqual({});
  });
  test("compound JSON-encoded keys pass through (e.g. camera-lens)", () => {
    const filters = {
      gear: {
        "camera-lens": {
          '["FUJIFILM X-T5","FUJIFILM XF27mmF2.8"]': noop,
        },
      },
    };
    expect(filter.toServerFilters(filters)).toEqual({
      gear: {
        "camera-lens": ['["FUJIFILM X-T5","FUJIFILM XF27mmF2.8"]'],
      },
    });
  });
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
        settings: {
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
        settings: {
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
        settings: {
          "focal-length": { 50: ("dummy" as any), 28: ("dummy" as any) },
          aperture: { 2.8: ("dummy" as any) },
        },
        gear: { camera: {} },
      });
    });
    test("Category focal-length", () => {
      const result = filter.applyNewFilter(
        filters,
        "settings",
        "focal-length",
        "x",
        "unknown"
      );
      expect(typeof result.settings["focal-length"].x).toBe("function");
      result.settings["focal-length"].x(mockPhoto);
      expect(mockPhoto.matches).toBeCalled();
      expect(mockPhoto.matches.mock.calls[0][0]).toBe("focal-length");
      expect(mockPhoto.matches.mock.calls[0][1]).toBe("x");
      delete result.settings["focal-length"].x;
      expect(result).toEqual({
        settings: {
          "focal-length": { 50: ("dummy" as any), 28: ("dummy" as any) },
          aperture: { 2.8: ("dummy" as any) },
        },
      });
    });
    test("Category focal-length, remove previous", () => {
      const result = filter.applyNewFilter(
        filters,
        "settings",
        "focal-length",
        "50",
        "unknown"
      );
      expect(result).toEqual({
        settings: {
          "focal-length": { 28: ("dummy" as any) },
          aperture: { 2.8: ("dummy" as any) },
        },
      });
    });
    test("Category focal-length, remove last in category", () => {
      const result = filter.applyNewFilter(
        filters,
        "settings",
        "aperture",
        "2.8",
        "unknown"
      );
      expect(result).toEqual({
        settings: { "focal-length": { 50: ("dummy" as any), 28: ("dummy" as any) } },
      });
    });
  });
});
