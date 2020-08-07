import scroll from "./scroll";

let s;
describe("With history size 2", () => {
  beforeEach(() => {
    s = scroll(2);
  });

  describe("Distinct pages", () => {
    test("One event", () => {
      s.set("foo", 42);
      expect(s.get("foo")).toBe(42);
    });
    test("Two events", () => {
      s.set("one", 1);
      s.set("two", 2);
      expect(s.get("one")).toBe(1);
      expect(s.get("two")).toBe(2);
    });
    test("Three events", () => {
      s.set("one", 1);
      s.set("two", 2);
      s.set("three", 3);
      expect(s.get("one")).toBe(0);
      expect(s.get("two")).toBe(2);
      expect(s.get("three")).toBe(3);
    });
  });
  describe("Repeating page", () => {
    test("One page", () => {
      s.set("foo", 1);
      s.set("foo", 2);
      s.set("foo", 3);
      expect(s.get("foo")).toBe(3);
    });
    test("Alternating two pages", () => {
      s.set("one", 1);
      s.set("two", 4);
      s.set("one", 2);
      s.set("two", 5);
      s.set("one", 3);
      s.set("two", 6);
      expect(s.get("one")).toBe(3);
      expect(s.get("two")).toBe(6);
    });
    test("Alternating three pages", () => {
      s.set("one", 1);
      s.set("two", 4);
      s.set("three", 7);
      s.set("one", 2);
      s.set("two", 5);
      s.set("three", 8);
      s.set("one", 3);
      s.set("two", 6);
      s.set("three", 9);
      expect(s.get("one")).toBe(0);
      expect(s.get("two")).toBe(6);
      expect(s.get("three")).toBe(9);
    });
    test("Consecutive three pages", () => {
      s.set("one", 1);
      s.set("one", 2);
      s.set("one", 3);
      s.set("two", 4);
      s.set("two", 5);
      s.set("two", 6);
      s.set("three", 8);
      s.set("three", 7);
      s.set("three", 9);
      expect(s.get("one")).toBe(0);
      expect(s.get("two")).toBe(6);
      expect(s.get("three")).toBe(9);
    });
  });
});

describe("With history size 0", () => {
  beforeEach(() => {
    s = scroll(0);
  });
  test("One event", () => {
    s.set("foo", 42);
    expect(s.get("foo")).toBe(42);
  });
});

describe("With default history size", () => {
  beforeEach(() => {
    s = scroll();
  });
  describe("Repeating page with default history size", () => {
    test("Three pages", () => {
      s.set("one", 1);
      s.set("two", 4);
      s.set("three", 7);
      s.set("one", 2);
      s.set("two", 5);
      s.set("three", 8);
      s.set("one", 3);
      s.set("two", 6);
      s.set("three", 9);
      expect(s.get("one")).toBe(3);
      expect(s.get("two")).toBe(6);
      expect(s.get("three")).toBe(9);
    });
  });
});
