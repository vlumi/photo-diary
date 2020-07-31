import calendar from "./calendar";

describe("daysInMonth()", () => {
  describe("January", () => {
    test("2020-01", () => expect(calendar.daysInMonth(2020, 1)).toBe(31));
  });
  describe("February", () => {
    test("1900-02", () => expect(calendar.daysInMonth(1900, 2)).toBe(28));
    test("2000-02", () => expect(calendar.daysInMonth(2000, 2)).toBe(29));
    test("2004-02", () => expect(calendar.daysInMonth(2004, 2)).toBe(29));
    test("2020-02", () => expect(calendar.daysInMonth(2020, 2)).toBe(29));
    test("2021-02", () => expect(calendar.daysInMonth(2021, 2)).toBe(28));
  });
  describe("April", () => {
    test("2020-01", () => expect(calendar.daysInMonth(2020, 4)).toBe(30));
  });
  describe("December", () => {
    test("2020-12", () => expect(calendar.daysInMonth(2020, 12)).toBe(31));
  });
});
describe("months()", () => {
  test("Basic", () =>
    expect(calendar.months(2020)).toStrictEqual([
      1,
      2,
      3,
      4,
      5,
      6,
      7,
      8,
      9,
      10,
      11,
      12,
    ]));
  test("Limit year, full", () =>
    expect(calendar.months(2020, 2020, 1, 2020, 12)).toStrictEqual([
      1,
      2,
      3,
      4,
      5,
      6,
      7,
      8,
      9,
      10,
      11,
      12,
    ]));
  test("Limit year, 2-12", () =>
    expect(calendar.months(2020, 2020, 2, 2020, 12)).toStrictEqual([
      2,
      3,
      4,
      5,
      6,
      7,
      8,
      9,
      10,
      11,
      12,
    ]));
  test("Limit year, 2-11", () =>
    expect(calendar.months(2020, 2020, 2, 2020, 11)).toStrictEqual([
      2,
      3,
      4,
      5,
      6,
      7,
      8,
      9,
      10,
      11,
    ]));
  test("Limit year, 1-11", () =>
    expect(calendar.months(2020, 2020, 1, 2020, 11)).toStrictEqual([
      1,
      2,
      3,
      4,
      5,
      6,
      7,
      8,
      9,
      10,
      11,
    ]));
});
describe("monthDay()", () => {
  test("2020-01", () =>
    expect(calendar.monthDays(2020, 1)).toStrictEqual([
      1,
      2,
      3,
      4,
      5,
      6,
      7,
      8,
      9,
      10,
      11,
      12,
      13,
      14,
      15,
      16,
      17,
      18,
      19,
      20,
      21,
      22,
      23,
      24,
      25,
      26,
      27,
      28,
      29,
      30,
      31,
    ]));
  test("2020-02", () =>
    expect(calendar.monthDays(2020, 2)).toStrictEqual([
      1,
      2,
      3,
      4,
      5,
      6,
      7,
      8,
      9,
      10,
      11,
      12,
      13,
      14,
      15,
      16,
      17,
      18,
      19,
      20,
      21,
      22,
      23,
      24,
      25,
      26,
      27,
      28,
      29,
    ]));
});
describe("daysOfWeek()", () => {
  // TODO: mock config.FIRST_WEEKDAY
  test("Monday first", () =>
    expect(calendar.daysOfWeek()).toStrictEqual([
      "mon",
      "tue",
      "wed",
      "thu",
      "fri",
      "sat",
      "sun",
    ]));
});
