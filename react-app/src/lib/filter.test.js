import filter from "./filter";

let mockPhoto;
beforeEach(() => {
  mockPhoto = { matches: jest.fn() };
});
describe("applyNewFilter", () => {
  describe("No previous filters", () => {
    test("Empty category", () => {
      const result = filter.applyNewFilter({}, "", "", "unknown");
      expect(result).toEqual({});
    });
    test("Category author", () => {
      const result = filter.applyNewFilter({}, "author", "x", "unknown");
      expect(typeof result.author.x).toBe("function");
      result.author.x(mockPhoto);
      expect(mockPhoto.matches).toBeCalled();
      expect(mockPhoto.matches.mock.calls[0][0]).toBe("author");
      expect(mockPhoto.matches.mock.calls[0][1]).toBe("x");
      delete result.author.x;
      expect(result).toEqual({
        author: {},
      });
    });
    test("Category camera", () => {
      const result = filter.applyNewFilter({}, "camera", "x", "unknown");
      expect(typeof result.camera.x).toBe("function");
      result.camera.x(mockPhoto);
      expect(mockPhoto.matches).toBeCalled();
      expect(mockPhoto.matches.mock.calls[0][0]).toBe("camera");
      expect(mockPhoto.matches.mock.calls[0][1]).toBe("x");
      delete result.camera.x;
      expect(result).toEqual({
        camera: {},
      });
    });
    test("Category camera, unknown", () => {
      const result = filter.applyNewFilter({}, "camera", "unknown", "unknown");
      expect(typeof result.camera.unknown).toBe("function");
      result.camera.unknown(mockPhoto);
      expect(mockPhoto.matches).toBeCalled();
      expect(mockPhoto.matches.mock.calls[0][0]).toBe("camera");
      expect(mockPhoto.matches.mock.calls[0][1]).toBe(undefined);
      delete result.camera.unknown;
      expect(result).toEqual({
        camera: {},
      });
    });
    test("Category camera-lens", () => {
      const result = filter.applyNewFilter(
        {},
        "camera-lens",
        '["foo","bar"]',
        "unknown"
      );
      expect(typeof result["camera-lens"]['["foo","bar"]']).toBe("function");
      result["camera-lens"]['["foo","bar"]'](mockPhoto);
      expect(mockPhoto.matches).toBeCalled();
      expect(mockPhoto.matches.mock.calls[0][0]).toBe("camera-lens");
      expect(mockPhoto.matches.mock.calls[0][1]).toBe('["foo","bar"]');
      delete result["camera-lens"]['["foo","bar"]'];
      expect(result).toEqual({
        "camera-lens": {},
      });
    });
    test("Category camera-lens, unknown", () => {
      const result = filter.applyNewFilter(
        {},
        "camera-lens",
        '["foo","unknown"]',
        "unknown"
      );
      expect(typeof result["camera-lens"]['["foo","unknown"]']).toBe(
        "function"
      );
      result["camera-lens"]['["foo","unknown"]'](mockPhoto);
      expect(mockPhoto.matches).toBeCalled();
      expect(mockPhoto.matches.mock.calls[0][0]).toBe("camera-lens");
      expect(mockPhoto.matches.mock.calls[0][1]).toBe('["foo",null]');
      delete result["camera-lens"]['["foo","unknown"]'];
      expect(result).toEqual({
        "camera-lens": {},
      });
    });
  });
  describe("With one previous filter", () => {
    let filters;
    beforeEach(() => {
      filters = { "focal-length": { 50: "dummy" } };
    });
    test("Empty category", () => {
      const result = filter.applyNewFilter(filters, "", "", "unknown");
      expect(result).toEqual(filters);
    });
    test("Category author", () => {
      const result = filter.applyNewFilter(filters, "author", "x", "unknown");
      expect(typeof result.author.x).toBe("function");
      result.author.x(mockPhoto);
      expect(mockPhoto.matches).toBeCalled();
      expect(mockPhoto.matches.mock.calls[0][0]).toBe("author");
      expect(mockPhoto.matches.mock.calls[0][1]).toBe("x");
      delete result.author.x;
      expect(result).toEqual({
        "focal-length": { 50: "dummy" },
        author: {},
      });
    });
    test("Category camera", () => {
      const result = filter.applyNewFilter(filters, "camera", "x", "unknown");
      expect(typeof result.camera.x).toBe("function");
      result.camera.x(mockPhoto);
      expect(mockPhoto.matches).toBeCalled();
      expect(mockPhoto.matches.mock.calls[0][0]).toBe("camera");
      expect(mockPhoto.matches.mock.calls[0][1]).toBe("x");
      delete result.camera.x;
      expect(result).toEqual({
        "focal-length": { 50: "dummy" },
        camera: {},
      });
    });
    test("Category focal-length", () => {
      const result = filter.applyNewFilter(
        filters,
        "focal-length",
        "x",
        "unknown"
      );
      expect(typeof result["focal-length"].x).toBe("function");
      result["focal-length"].x(mockPhoto);
      expect(mockPhoto.matches).toBeCalled();
      expect(mockPhoto.matches.mock.calls[0][0]).toBe("focal-length");
      expect(mockPhoto.matches.mock.calls[0][1]).toBe("x");
      delete result["focal-length"].x;
      expect(result).toEqual({
        "focal-length": { 50: "dummy" },
      });
    });
    test("Category focal-length, remove previous", () => {
      const result = filter.applyNewFilter(
        filters,
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
        "focal-length": { 50: "dummy", 28: "dummy" },
        aperture: { 2.8: "dummy" },
      };
    });
    test("Empty category", () => {
      const result = filter.applyNewFilter(filters, "", "", "unknown");
      expect(result).toEqual(filters);
    });
    test("Category author", () => {
      const result = filter.applyNewFilter(filters, "author", "x", "unknown");
      expect(typeof result.author.x).toBe("function");
      result.author.x(mockPhoto);
      expect(mockPhoto.matches).toBeCalled();
      expect(mockPhoto.matches.mock.calls[0][0]).toBe("author");
      expect(mockPhoto.matches.mock.calls[0][1]).toBe("x");
      delete result.author.x;
      expect(result).toEqual({
        "focal-length": { 50: "dummy", 28: "dummy" },
        aperture: { 2.8: "dummy" },
        author: {},
      });
    });
    test("Category camera", () => {
      const result = filter.applyNewFilter(filters, "camera", "x", "unknown");
      expect(typeof result.camera.x).toBe("function");
      result.camera.x(mockPhoto);
      expect(mockPhoto.matches).toBeCalled();
      expect(mockPhoto.matches.mock.calls[0][0]).toBe("camera");
      expect(mockPhoto.matches.mock.calls[0][1]).toBe("x");
      delete result.camera.x;
      expect(result).toEqual({
        "focal-length": { 50: "dummy", 28: "dummy" },
        aperture: { 2.8: "dummy" },
        camera: {},
      });
    });
    test("Category focal-length", () => {
      const result = filter.applyNewFilter(
        filters,
        "focal-length",
        "x",
        "unknown"
      );
      expect(typeof result["focal-length"].x).toBe("function");
      result["focal-length"].x(mockPhoto);
      expect(mockPhoto.matches).toBeCalled();
      expect(mockPhoto.matches.mock.calls[0][0]).toBe("focal-length");
      expect(mockPhoto.matches.mock.calls[0][1]).toBe("x");
      delete result["focal-length"].x;
      expect(result).toEqual({
        "focal-length": { 50: "dummy", 28: "dummy" },
        aperture: { 2.8: "dummy" },
      });
    });
    test("Category focal-length, remove previous", () => {
      const result = filter.applyNewFilter(
        filters,
        "focal-length",
        "50",
        "unknown"
      );
      expect(result).toEqual({
        "focal-length": { 28: "dummy" },
        aperture: { 2.8: "dummy" },
      });
    });
  });
});
