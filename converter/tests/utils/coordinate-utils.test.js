const {
  latitudeToDecimal,
  longitudeToDecimal,
} = require("../../utils/coordinate-utils");

describe("Latitude extremes", () => {
  test("Decimal of 0° 0′ 0″ N", () =>
    expect(latitudeToDecimal(0, 0, 0, "N")).toBe(0));
  test("Decimal of 0° 0′ 0″ S", () =>
    expect(latitudeToDecimal(0, 0, 0, "S")).toBe(-0));
  test("Decimal of 90° 0′ 0″ N", () =>
    expect(latitudeToDecimal(90, 0, 0, "N")).toBe(90));
  test("Decimal of 90° 0′ 0″ S", () =>
    expect(latitudeToDecimal(90, 0, 0, "S")).toBe(-90));
});

describe("Longitude extremes", () => {
  test("Decimal of 0° 0′ 0″ E", () =>
    expect(longitudeToDecimal(0, 0, 0, "E")).toBe(0));
  test("Decimal of 0° 0′ 0″ W", () =>
    expect(longitudeToDecimal(0, 0, 0, "W")).toBe(-0));
  test("Decimal of 180° 0′ 0″ E", () =>
    expect(longitudeToDecimal(180, 0, 0, "E")).toBe(180));
  test("Decimal of 180° 0′ 0″ W", () =>
    expect(longitudeToDecimal(180, 0, 0, "W")).toBe(-180));
});

describe("Latitude excess", () => {
  test("Decimal of 91° 0′ 0″ N", () =>
    expect(() => latitudeToDecimal(91, 0, 0, "N")).toThrowError());
  test("Decimal of 91° 0′ 0″ N", () =>
    expect(() => latitudeToDecimal(91, 0, 0, "S")).toThrow());
  test("Decimal of 0° 60′ 0″ N", () =>
    expect(() => latitudeToDecimal(0, 60, 0, "N")).toThrow());
  test("Decimal of 0° 60′ 0″ N", () =>
    expect(() => latitudeToDecimal(0, 60, 0, "S")).toThrow());
  test("Decimal of 0° 0′ 60″ N", () =>
    expect(() => latitudeToDecimal(0, 0, 60, "N")).toThrow());
  test("Decimal of 0° 0′ 60″ N", () =>
    expect(() => latitudeToDecimal(0, 0, 60, "S")).toThrow());
  test("Decimal of 90° 0′ 0.1″ N", () =>
    expect(() => latitudeToDecimal(90, 0, 0.1, "N")).toThrow());
  test("Decimal of 90° 0′ 0.1″ N", () =>
    expect(() => latitudeToDecimal(90, 0, 0.1, "S")).toThrow());
});

describe("Longitude excess", () => {
  test("Decimal of 181° 0′ 0″ N", () =>
    expect(() => longitudeToDecimal(181, 0, 0, "N")).toThrowError());
  test("Decimal of 181° 0′ 0″ N", () =>
    expect(() => longitudeToDecimal(181, 0, 0, "S")).toThrow());
  test("Decimal of 0° 60′ 0″ N", () =>
    expect(() => longitudeToDecimal(0, 60, 0, "N")).toThrow());
  test("Decimal of 0° 60′ 0″ N", () =>
    expect(() => longitudeToDecimal(0, 60, 0, "S")).toThrow());
  test("Decimal of 0° 0′ 60″ N", () =>
    expect(() => longitudeToDecimal(0, 0, 60, "N")).toThrow());
  test("Decimal of 0° 0′ 60″ N", () =>
    expect(() => longitudeToDecimal(0, 0, 60, "S")).toThrow());
  test("Decimal of 180° 0′ 0.1″ N", () =>
    expect(() => longitudeToDecimal(180, 0, 0.1, "N")).toThrow());
  test("Decimal of 180° 0′ 0.1″ N", () =>
    expect(() => longitudeToDecimal(180, 0, 0.1, "S")).toThrow());
});

describe("Latitude examples", () => {
  test("Decimal of 10° 15′ 0″ N", () =>
    expect(latitudeToDecimal(10, 15, 0, "N")).toBe(10.25));
  test("Decimal of 50° 30.6′ 0″ N", () =>
    expect(latitudeToDecimal(50, 30.6, 0, "N")).toBe(50.51));
  test("Decimal of 50° 30′ 36″ S", () =>
    expect(latitudeToDecimal(50, 30.6, 0, "S")).toBe(-50.51));
  test("Decimal of 15.1234° 0′ 0″ S", () =>
    expect(latitudeToDecimal(15.1234, 0, 0, "S")).toBe(-15.1234));
  test("Decimal of 60° 10′ 15″ N", () =>
    expect(latitudeToDecimal(60, 10, 48, "N")).toBe(60.18));
});

describe("Longitude examples", () => {
  test("Decimal of 60° 10′ 15″ E", () =>
    expect(longitudeToDecimal(60, 10, 48, "E")).toBe(60.18));
  test("Decimal of 50° 30.6′ 0″ E", () =>
    expect(longitudeToDecimal(50, 30.6, 0, "E")).toBe(50.51));
  test("Decimal of 50° 30′ 36″ W", () =>
    expect(longitudeToDecimal(50, 30.6, 0, "W")).toBe(-50.51));
  test("Decimal of 15.1234° 0′ 0″ W", () =>
    expect(longitudeToDecimal(15.1234, 0, 0, "W")).toBe(-15.1234));
  test("Decimal of 24° 56′ 15″ E", () =>
    expect(longitudeToDecimal(24, 56, 15, "E")).toBe(24.9375));
});
