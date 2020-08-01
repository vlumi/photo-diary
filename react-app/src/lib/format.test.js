import format from "./format";

describe("identity", () => {
  test("undefined", () => expect(format.identity(undefined)).toBeUndefined());
  test("empty string", () => expect(format.identity("")).toBe(""));
  test("string", () => expect(format.identity("abc")).toBe("abc"));
  test("number", () => expect(format.identity(42)).toBe(42));
});
describe("number", () => {
  const number = format.number("en");
  describe("default", () => {
    test("0", () => expect(number.default(0)).toBe("0"));
    test("1000", () => expect(number.default(1000)).toBe("1,000"));
    test("0.123", () => expect(number.default(0.123)).toBe("0.123"));
    test("10000000.12", () =>
      expect(number.default(10000000.12)).toBe("10,000,000.12"));
  });
  describe("twoDecimal", () => {
    test("0", () => expect(number.twoDecimal(0)).toBe("0.00"));
    test("1000", () => expect(number.twoDecimal(1000)).toBe("1,000.00"));
    test("0.123", () => expect(number.twoDecimal(0.123)).toBe("0.12"));
    test("10000000.12", () =>
      expect(number.twoDecimal(10000000.12)).toBe("10,000,000.12"));
  });
  describe("oneDecimal", () => {
    test("0", () => expect(number.oneDecimal(0)).toBe("0.0"));
    test("1000", () => expect(number.oneDecimal(1000)).toBe("1,000.0"));
    test("0.123", () => expect(number.oneDecimal(0.123)).toBe("0.1"));
    test("10000000.12", () =>
      expect(number.oneDecimal(10000000.12)).toBe("10,000,000.1"));
  });
});
describe("padNumber", () => {
  test("empty", () => expect(format.padNumber("", 5, " ")).toBe("00000"));
  test("negative", () => expect(format.padNumber(-1, 5, " ")).toBe("-00001"));
  test("partial", () => expect(format.padNumber("123", 5, "0")).toBe("00123"));
  test("no padding", () =>
    expect(format.padNumber("12345", 5, "0")).toBe("12345"));
});
describe("share", () => {
  test("2/1", () => expect(format.share(2, 1)).toBe(200));
  test("1/1", () => expect(format.share(1, 1)).toBe(100));
  test("1/2", () => expect(format.share(1, 2)).toBe(50));
  test("2/16", () => expect(format.share(2, 16)).toBe(12.5));
});
describe("padLeft", () => {
  test("empty", () => expect(format.padLeft("", 5, " ")).toBe("     "));
  test("partial", () => expect(format.padLeft("123", 5, "0")).toBe("00123"));
  test("no padding", () =>
    expect(format.padLeft("12345", 5, "0")).toBe("12345"));
  test("longer", () => expect(format.padLeft("123456", 5, "0")).toBe("123456"));
});
describe("padRight", () => {
  test("empty", () => expect(format.padRight("", 5, " ")).toBe("     "));
  test("partial", () => expect(format.padRight("123", 5, "0")).toBe("12300"));
  test("no padding", () =>
    expect(format.padRight("12345", 5, "0")).toBe("12345"));
  test("longer", () =>
    expect(format.padRight("123456", 5, "0")).toBe("123456"));
});
describe("date", () => {
  test("empty", () => expect(format.date({})).toBe(""));
  test("2020", () => expect(format.date({ year: 2020 })).toBe("2020"));
  test("2020-01", () =>
    expect(format.date({ year: 2020, month: 1 })).toBe("2020-01"));
  test("2020-01-05", () =>
    expect(format.date({ year: 2020, month: 1, day: 5 })).toBe("2020-01-05"));
  test("2020/01/05", () =>
    expect(format.date({ year: 2020, month: 1, day: 5, separator: "/" })).toBe(
      "2020/01/05"
    ));
});
describe("time", () => {
  test("empty", () => expect(format.time({})).toBe(""));
  test("10", () => expect(format.time({ hour: 10 })).toBe("10"));
  test("10:51", () =>
    expect(format.time({ hour: 10, minute: 51 })).toBe("10:51"));
  test("10:51:13", () =>
    expect(format.time({ hour: 10, minute: 51, second: 13 })).toBe("10:51:13"));
  test("10.51.13", () =>
    expect(
      format.time({ hour: 10, minute: 51, second: 13, separator: "." })
    ).toBe("10.51.13"));
});
describe("dayOfWeek", () => {
  test("Monday", () => expect(format.dayOfWeek(1)).toBe("mon"));
  test("Monday", () => expect(format.dayOfWeek(8)).toBe("mon"));
  test("Monday", () => expect(format.dayOfWeek(15)).toBe("mon"));
  test("Sunday", () => expect(format.dayOfWeek(0)).toBe("sun"));
  test("Sunday", () => expect(format.dayOfWeek(7)).toBe("sun"));
});
describe("countryName", () => {
  const countryData = {
    getName(code) {
      if (code === "fi") return "Finland";
      return undefined;
    },
  };
  test("Finland", () =>
    expect(format.countryName("en", countryData)("fi")).toBe("Finland"));
  test("England", () =>
    expect(format.countryName("en", countryData)("en")).toBe("en"));
});
describe("focalLength", () => {
  const formatExposure = format.exposure("en");
  test("N/A", () => expect(formatExposure.focalLength("N/A")).toBe("N/A"));
  test("50", () => expect(formatExposure.focalLength(50)).toBe("50"));
  test("23.5", () => expect(formatExposure.focalLength(23.5)).toBe("23.5"));
});
describe("aperture", () => {
  const formatExposure = format.exposure("en");
  test("N/A", () => expect(formatExposure.aperture("N/A")).toBe("N/A"));
  test("4.0", () => expect(formatExposure.aperture(4.0)).toBe("ƒ/4"));
  test("2.8", () => expect(formatExposure.aperture(2.8)).toBe("ƒ/2.8"));
});
describe("exposureTime", () => {
  const formatExposure = format.exposure("en");
  test("N/A", () => expect(formatExposure.exposureTime("N/A")).toBe("N/A"));
  test("2.5", () => expect(formatExposure.exposureTime(2.5)).toBe("2.5"));
  test("1", () => expect(formatExposure.exposureTime(1)).toBe("1"));
  test("0.5", () => expect(formatExposure.exposureTime(0.5)).toBe("1⁄2"));
  test("0.01", () => expect(formatExposure.exposureTime(0.01)).toBe("1⁄100"));
});
describe("iso", () => {
  const formatExposure = format.exposure("en");
  test("N/A", () => expect(formatExposure.iso("N/A")).toBe("N/A"));
  test("100", () => expect(formatExposure.iso(100)).toBe("100"));
  test("400", () => expect(formatExposure.iso(400)).toBe("400"));
});
describe("ev", () => {
  const formatExposure = format.exposure("en");
  test("N/A", () => expect(formatExposure.ev("N/A")).toBe("N/A"));
  test("5.0", () => expect(formatExposure.ev(5.0)).toBe("5"));
  test("13", () => expect(formatExposure.ev(13)).toBe("13"));
});
describe("resolution", () => {
  const formatExposure = format.exposure("en");
  test("N/A", () => expect(formatExposure.resolution("N/A")).toBe("N/A"));
  test("5.0", () => expect(formatExposure.resolution(5.0)).toBe("5"));
  test("13", () => expect(formatExposure.resolution(13)).toBe("13"));
});
describe("gear", () => {
  test("empty", () => expect(format.gear()).toBeUndefined());
  test("make only", () => expect(format.gear("Canon")).toBe("Canon"));
  test("model only", () => expect(format.gear("", "EOS 10D")).toBe("EOS 10D"));
  test("make and model", () =>
    expect(format.gear("FUJIFILM", "X-T2")).toBe("FUJIFILM X-T2"));
  test("deduplication", () =>
    expect(format.gear("Canon", "Canon EOS 10D")).toBe("Canon EOS 10D"));
});
describe("coordinates", () => {
  test("0, 0", () => expect(format.coordinates(0, 0)).toBe("0°0′0″N 0°0′0″E"));
});
