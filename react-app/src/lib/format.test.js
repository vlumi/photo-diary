import format from "./format";

require("./config");
jest.mock("./config", () => ({
  FIRST_WEEKDAY: 1,
}));

describe("identity()", () => {
  test("undefined", () => expect(format.identity(undefined)).toBeUndefined());
  test("empty string", () => expect(format.identity("")).toBe(""));
  test("string", () => expect(format.identity("abc")).toBe("abc"));
  test("number", () => expect(format.identity(42)).toBe(42));
});
describe("number", () => {
  const number = format.number("en");
  describe("default()", () => {
    test("0", () => expect(number.default(0)).toBe("0"));
    test("1000", () => expect(number.default(1000)).toBe("1,000"));
    test("0.123", () => expect(number.default(0.123)).toBe("0.123"));
    test("10000000.12", () =>
      expect(number.default(10000000.12)).toBe("10,000,000.12"));
  });
  describe("twoDecimal()", () => {
    test("0", () => expect(number.twoDecimal(0)).toBe("0.00"));
    test("1000", () => expect(number.twoDecimal(1000)).toBe("1,000.00"));
    test("0.123", () => expect(number.twoDecimal(0.123)).toBe("0.12"));
    test("10000000.12", () =>
      expect(number.twoDecimal(10000000.12)).toBe("10,000,000.12"));
  });
  describe("oneDecimal()", () => {
    test("0", () => expect(number.oneDecimal(0)).toBe("0.0"));
    test("1000", () => expect(number.oneDecimal(1000)).toBe("1,000.0"));
    test("0.123", () => expect(number.oneDecimal(0.123)).toBe("0.1"));
    test("10000000.12", () =>
      expect(number.oneDecimal(10000000.12)).toBe("10,000,000.1"));
  });
});
describe("padNumber()", () => {
  test("empty", () => expect(format.padNumber("", 5, " ")).toBe("00000"));
  test("negative", () => expect(format.padNumber(-1, 5, " ")).toBe("-00001"));
  test("partial", () => expect(format.padNumber("123", 5, "0")).toBe("00123"));
  test("no padding", () =>
    expect(format.padNumber("12345", 5, "0")).toBe("12345"));
});
describe("share()", () => {
  test("2/1", () => expect(format.share(2, 1)).toBe(200));
  test("1/1", () => expect(format.share(1, 1)).toBe(100));
  test("1/2", () => expect(format.share(1, 2)).toBe(50));
  test("2/16", () => expect(format.share(2, 16)).toBe(12.5));
});
describe("padLeft()", () => {
  test("empty", () => expect(format.padLeft("", 5, " ")).toBe("     "));
  test("partial", () => expect(format.padLeft("123", 5, "0")).toBe("00123"));
  test("no padding", () =>
    expect(format.padLeft("12345", 5, "0")).toBe("12345"));
  test("longer", () => expect(format.padLeft("123456", 5, "0")).toBe("123456"));
});
describe("padRight()", () => {
  test("empty", () => expect(format.padRight("", 5, " ")).toBe("     "));
  test("partial", () => expect(format.padRight("123", 5, "0")).toBe("12300"));
  test("no padding", () =>
    expect(format.padRight("12345", 5, "0")).toBe("12345"));
  test("longer", () =>
    expect(format.padRight("123456", 5, "0")).toBe("123456"));
});
describe("date()", () => {
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
describe("time()", () => {
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
  test("10.00.00", () =>
    expect(
      format.time({ hour: 10, minute: 0, second: 0, separator: "." })
    ).toBe("10.00.00"));
});
describe("dayOfWeek()", () => {
  test("Monday", () => expect(format.dayOfWeek(1)).toBe("mon"));
  test("Monday", () => expect(format.dayOfWeek(8)).toBe("mon"));
  test("Monday", () => expect(format.dayOfWeek(15)).toBe("mon"));
  test("Sunday", () => expect(format.dayOfWeek(0)).toBe("sun"));
  test("Sunday", () => expect(format.dayOfWeek(7)).toBe("sun"));
});
describe("countryName()", () => {
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
describe("exposure", () => {
  const formatExposure = format.exposure("en", (key) => { return key });
  describe("focalLength()", () => {
    test("N/A", () => expect(formatExposure.focalLength("N/A")).toBe("N/A"));
    test("50", () => expect(formatExposure.focalLength(50)).toBe("50"));
    test("23.5", () => expect(formatExposure.focalLength(23.5)).toBe("23.5"));
  });
  describe("aperture()", () => {
    test("N/A", () => expect(formatExposure.aperture("N/A")).toBe("N/A"));
    test("4.0", () => expect(formatExposure.aperture(4.0)).toBe("ƒ/4"));
    test("2.8", () => expect(formatExposure.aperture(2.8)).toBe("ƒ/2.8"));
  });
  describe("exposureTime()", () => {
    test("N/A", () => expect(formatExposure.exposureTime("N/A")).toBe("N/A"));
    test("2.5", () => expect(formatExposure.exposureTime(2.5)).toBe("2.5"));
    test("1", () => expect(formatExposure.exposureTime(1)).toBe("1"));
    test("0.5", () => expect(formatExposure.exposureTime(0.5)).toBe("1⁄2"));
    test("0.01", () => expect(formatExposure.exposureTime(0.01)).toBe("1⁄100"));
  });
  describe("iso()", () => {
    test("N/A", () => expect(formatExposure.iso("N/A")).toBe("N/A"));
    test("100", () => expect(formatExposure.iso(100)).toBe("100"));
    test("400", () => expect(formatExposure.iso(400)).toBe("400"));
  });
  describe("ev()", () => {
    test("N/A", () => expect(formatExposure.ev("N/A")).toBe("N/A"));
    test("5.0", () => expect(formatExposure.ev(5.0)).toBe("5"));
    test("13", () => expect(formatExposure.ev(13)).toBe("13"));
  });
  describe("resolution()", () => {
    test("N/A", () => expect(formatExposure.resolution("N/A")).toBe("N/A"));
    test("5.0", () => expect(formatExposure.resolution(5.0)).toBe("5"));
    test("13", () => expect(formatExposure.resolution(13)).toBe("13"));
  });
  describe("orientation()", () => {
    test("N/A", () => expect(formatExposure.orientation("N/A")).toBe("stats-orientation-N/A"));
    test("square", () => expect(formatExposure.orientation("square")).toBe("stats-orientation-square"));
    test("landscape", () => expect(formatExposure.orientation("landscape")).toBe("stats-orientation-landscape"));
    test("portrait", () => expect(formatExposure.orientation("portrait")).toBe("stats-orientation-portrait"));
  });
  describe("aspectRatio()", () => {
    test("N/A", () => expect(formatExposure.aspectRatio("N/A")).toBe("N/A"));
    test("3/2", () => expect(formatExposure.aspectRatio("3/2")).toBe("3/2"));
    test("1/1", () => expect(formatExposure.aspectRatio("1/1")).toBe("1/1"));
  });
});
describe("gear()", () => {
  test("empty", () => expect(format.gear()).toBeUndefined());
  test("make only", () => expect(format.gear("Canon")).toBe("Canon"));
  test("model only", () => expect(format.gear("", "EOS 10D")).toBe("EOS 10D"));
  test("make and model", () =>
    expect(format.gear("FUJIFILM", "X-T2")).toBe("FUJIFILM X-T2"));
  test("deduplication", () =>
    expect(format.gear("Canon", "Canon EOS 10D")).toBe("Canon EOS 10D"));
});
describe("coordinates()", () => {
  test("0, 0", () => expect(format.coordinates(0, 0)).toBe("0°0′0″N 0°0′0″E"));
});

describe("categoryValue()", () => {
  let mockT;
  beforeEach(() => {
    mockT = jest.fn(() => "Mocked");
  });
  const countryData = {
    getName: (code) => {
      if (code === "fi") return "Finland";
      return undefined;
    },
  };
  test("author", () =>
    expect(
      format.categoryValue("en", mockT, countryData)("author")("Some Author")
    ).toBe("Some Author"));
  test("country", () =>
    expect(
      format.categoryValue("en", mockT, countryData)("country")("fi")
    ).toBe("Finland"));
  test("year-month 2020-1", () => {
    expect(
      format.categoryValue("en", mockT, countryData)("year-month")("2020-1")
    ).toBe("Mocked");
    expect(mockT).toHaveBeenCalledTimes(2);
    expect(mockT.mock.calls[0][0]).toBe("month-long-1");
    expect(mockT.mock.calls[1][0]).toBe("stats-year-month");
    expect(mockT.mock.calls[1][1]).toStrictEqual({
      year: 2020,
      month: "Mocked",
    });
  });
  test("year-month 2020-01", () => {
    expect(
      format.categoryValue("en", mockT, countryData)("year-month")("2020-01")
    ).toBe("Mocked");
    expect(mockT).toHaveBeenCalledTimes(2);
    expect(mockT.mock.calls[0][0]).toBe("month-long-1");
    expect(mockT.mock.calls[1][0]).toBe("stats-year-month");
    expect(mockT.mock.calls[1][1]).toStrictEqual({
      year: 2020,
      month: "Mocked",
    });
  });
  test("year", () =>
    expect(format.categoryValue("en", mockT, countryData)("year")(2020)).toBe(
      2020
    ));
  test("month", () => {
    expect(format.categoryValue("en", mockT, countryData)("month")(1)).toBe(
      "Mocked"
    );
    expect(mockT).toHaveBeenCalledTimes(1);
    expect(mockT.mock.calls[0][0]).toBe("month-long-1");
  });
  test("weekday", () => {
    expect(format.categoryValue("en", mockT, countryData)("weekday")(1)).toBe(
      "Mocked"
    );
    expect(mockT).toHaveBeenCalledTimes(1);
    expect(mockT.mock.calls[0][0]).toBe("weekday-long-mon");
  });
  test("hour", () => {
    expect(format.categoryValue("en", mockT, countryData)("hour")(5)).toBe(
      "05:00–"
    );
  });
  test("camera-make", () =>
    expect(
      format.categoryValue("en", mockT, countryData)("camera-make")("CMake")
    ).toBe("CMake"));
  test("camera", () =>
    expect(
      format.categoryValue("en", mockT, countryData)("camera")("CMake CModel")
    ).toBe("CMake CModel"));
  test("lens", () =>
    expect(
      format.categoryValue("en", mockT, countryData)("lens")("LMake LModel")
    ).toBe("LMake LModel"));
  test("camera-lens both known", () =>
    expect(
      format.categoryValue("en", mockT, countryData)("camera-lens")(
        '["C", "L"]'
      )
    ).toBe("C + L"));
  test("camera-lens camera known", () => {
    expect(
      format.categoryValue("en", mockT, countryData)("camera-lens")(
        '["C", null]'
      )
    ).toBe("C + Mocked");
    expect(mockT).toHaveBeenCalledTimes(1);
    expect(mockT.mock.calls[0][0]).toBe("stats-unknown");
  });
  test("camera-lens lens known", () => {
    expect(
      format.categoryValue("en", mockT, countryData)("camera-lens")(
        '[null, "L"]'
      )
    ).toBe("Mocked + L");
    expect(mockT).toHaveBeenCalledTimes(1);
    expect(mockT.mock.calls[0][0]).toBe("stats-unknown");
  });
  test("focal-length", () =>
    expect(
      format.categoryValue("en", mockT, countryData)("focal-length")(100)
    ).toBe("100"));
  test("aperture", () =>
    expect(
      format.categoryValue("en", mockT, countryData)("aperture")(2.8)
    ).toBe("ƒ/2.8"));
  test("exposure-time 1", () =>
    expect(
      format.categoryValue("en", mockT, countryData)("exposure-time")(1)
    ).toBe("1"));
  test("exposure-time 0.1", () =>
    expect(
      format.categoryValue("en", mockT, countryData)("exposure-time")(0.1)
    ).toBe("1⁄10"));
  test("ISO", () =>
    expect(format.categoryValue("en", mockT, countryData)("iso")(100)).toBe(
      "100"
    ));
  test("EV 9", () =>
    expect(format.categoryValue("en", mockT, countryData)("ev")(9)).toBe("9"));
  test("EV 9.1", () =>
    expect(format.categoryValue("en", mockT, countryData)("ev")(9.1)).toBe(
      "9"
    ));
  test("EV 9.3", () =>
    expect(format.categoryValue("en", mockT, countryData)("ev")(9.3)).toBe(
      "9.5"
    ));
  test("EV 9.5", () =>
    expect(format.categoryValue("en", mockT, countryData)("ev")(9.5)).toBe(
      "9.5"
    ));
  test("LV 9", () =>
    expect(format.categoryValue("en", mockT, countryData)("lv")(9)).toBe("9"));
  test("LV 9.1", () =>
    expect(format.categoryValue("en", mockT, countryData)("lv")(9.1)).toBe(
      "9"
    ));
  test("LV 9.3", () =>
    expect(format.categoryValue("en", mockT, countryData)("lv")(9.3)).toBe(
      "9.5"
    ));
  test("LV 9.5", () =>
    expect(format.categoryValue("en", mockT, countryData)("lv")(9.5)).toBe(
      "9.5"
    ));
  test("resolution", () =>
    expect(
      format.categoryValue("en", mockT, countryData)("resolution")(6)
    ).toBe("6"));
  test("dummy", () =>
    expect(format.categoryValue("en", mockT, countryData)("dummy")("X")).toBe(
      "X"
    ));
});

describe("categorySorter", () => {
  let data;
  beforeEach(() => {
    data = [
      { key: "3", value: "10" },
      { key: "2", value: "3" },
      { key: "10", value: "2" },
    ];
  });
  const keyValueSorter = format.categorySorter("key", "value");
  const keyValueSorterMonday = format.categorySorter("key", "value", 1);
  const keyValueSorterSunday = format.categorySorter("key", "value", 0);
  const sortedByStrKeyAsc = [
    { key: "10", value: "2" },
    { key: "2", value: "3" },
    { key: "3", value: "10" },
  ];
  const sortedByNumKeyAsc = [
    { key: "2", value: "3" },
    { key: "3", value: "10" },
    { key: "10", value: "2" },
  ];
  const sortedByStrValueAsc = [
    { key: "3", value: "10" },
    { key: "10", value: "2" },
    { key: "2", value: "3" },
  ];
  test("author", () =>
    expect(data.sort(keyValueSorter("author"))).toStrictEqual(
      sortedByStrValueAsc
    ));
  test("country", () =>
    expect(data.sort(keyValueSorter("country"))).toStrictEqual(
      sortedByStrValueAsc
    ));
  test("year-month", () => {
    const ymData = [
      { key: "2020-3", value: 5 },
      { key: "2019-12", value: 7 },
      { key: "2018-4", value: 1 },
      { key: "2018-3", value: 10 },
      { key: "2020-1", value: 9 },
    ];
    expect(ymData.sort(keyValueSorter("year-month"))).toStrictEqual([
      { key: "2018-3", value: 10 },
      { key: "2018-4", value: 1 },
      { key: "2019-12", value: 7 },
      { key: "2020-1", value: 9 },
      { key: "2020-3", value: 5 },
    ]);
  });
  test("year", () =>
    expect(data.sort(keyValueSorter("year"))).toStrictEqual(sortedByNumKeyAsc));
  test("month", () =>
    expect(data.sort(keyValueSorter("month"))).toStrictEqual(
      sortedByNumKeyAsc
    ));
  describe("weekday", () => {
    let wdData;
    beforeEach(() => {
      wdData = [
        { key: "3", value: "10" },
        { key: "0", value: "3" },
        { key: "5", value: "2" },
        { key: "1", value: "8" },
        { key: "6", value: "1" },
        { key: "2", value: "7" },
        { key: "4", value: "6" },
      ];
    });
    test("default", () => {
      expect(wdData.sort(keyValueSorter("weekday"))).toStrictEqual([
        { key: "1", value: "8" },
        { key: "2", value: "7" },
        { key: "3", value: "10" },
        { key: "4", value: "6" },
        { key: "5", value: "2" },
        { key: "6", value: "1" },
        { key: "0", value: "3" },
      ]);
    });
    test("Monday", () => {
      expect(wdData.sort(keyValueSorterMonday("weekday"))).toStrictEqual([
        { key: "1", value: "8" },
        { key: "2", value: "7" },
        { key: "3", value: "10" },
        { key: "4", value: "6" },
        { key: "5", value: "2" },
        { key: "6", value: "1" },
        { key: "0", value: "3" },
      ]);
    });
    test("Sunday", () => {
      expect(wdData.sort(keyValueSorterSunday("weekday"))).toStrictEqual([
        { key: "0", value: "3" },
        { key: "1", value: "8" },
        { key: "2", value: "7" },
        { key: "3", value: "10" },
        { key: "4", value: "6" },
        { key: "5", value: "2" },
        { key: "6", value: "1" },
      ]);
    });
  });
  test("hour", () =>
    expect(data.sort(keyValueSorter("hour"))).toStrictEqual(sortedByNumKeyAsc));
  test("camera-make", () =>
    expect(data.sort(keyValueSorter("camera-make"))).toStrictEqual(
      sortedByStrKeyAsc
    ));
  test("camera", () =>
    expect(data.sort(keyValueSorter("camera"))).toStrictEqual(
      sortedByStrKeyAsc
    ));
  test("lens", () =>
    expect(data.sort(keyValueSorter("lens"))).toStrictEqual(sortedByStrKeyAsc));
  test("camera-lens", () =>
    expect(data.sort(keyValueSorter("camera-lens"))).toStrictEqual(
      sortedByStrKeyAsc
    ));
  test("focal-length", () =>
    expect(data.sort(keyValueSorter("focal-length"))).toStrictEqual(
      sortedByNumKeyAsc
    ));
  test("aperture", () =>
    expect(data.sort(keyValueSorter("aperture"))).toStrictEqual(
      sortedByNumKeyAsc
    ));
  test("exposure-time", () =>
    expect(data.sort(keyValueSorter("exposure-time"))).toStrictEqual(
      sortedByNumKeyAsc
    ));
  test("iso", () =>
    expect(data.sort(keyValueSorter("iso"))).toStrictEqual(sortedByNumKeyAsc));
  test("ev", () =>
    expect(data.sort(keyValueSorter("ev"))).toStrictEqual(sortedByNumKeyAsc));
  test("lv", () =>
    expect(data.sort(keyValueSorter("lv"))).toStrictEqual(sortedByNumKeyAsc));
  test("resolution", () =>
    expect(data.sort(keyValueSorter("resolution"))).toStrictEqual(
      sortedByNumKeyAsc
    ));
  test("dummy", () =>
    expect(data.sort(keyValueSorter("dummy"))).toStrictEqual(data));
});
