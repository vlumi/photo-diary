import calendar from "./calendar";

const config = require("./config");
jest.mock("./config", () => ({
  FIRST_WEEKDAY: 1,
}));

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
  test("Default (Monday first)", () => {
    expect(calendar.daysOfWeek()).toStrictEqual([
      "mon",
      "tue",
      "wed",
      "thu",
      "fri",
      "sat",
      "sun",
    ]);
  });
  test("Monday first", () => {
    expect(calendar.daysOfWeek(1)).toStrictEqual([
      "mon",
      "tue",
      "wed",
      "thu",
      "fri",
      "sat",
      "sun",
    ]);
  });
  test("Sunday first", () => {
    expect(calendar.daysOfWeek(0)).toStrictEqual([
      "sun",
      "mon",
      "tue",
      "wed",
      "thu",
      "fri",
      "sat",
    ]);
  });
});

describe("dayOfWeek()", () => {
  test("2020-01-01", () => expect(calendar.dayOfWeek(2020, 1, 1)).toBe("wed"));
  test("2020-02-28", () => expect(calendar.dayOfWeek(2020, 2, 28)).toBe("fri"));
  test("2020-02-29", () => expect(calendar.dayOfWeek(2020, 2, 29)).toBe("sat"));
  test("2020-03-01", () => expect(calendar.dayOfWeek(2020, 3, 1)).toBe("sun"));
});

describe("monthGrid()", () => {
  test("2020-01 Monday", () =>
    expect(calendar.monthGrid(2020, 1, 1)).toStrictEqual([
      [0, 0, 1, 2, 3, 4, 5],
      [6, 7, 8, 9, 10, 11, 12],
      [13, 14, 15, 16, 17, 18, 19],
      [20, 21, 22, 23, 24, 25, 26],
      [27, 28, 29, 30, 31, 0, 0],
    ]));
  test("2020-01 Default (Monday)", () =>
    expect(calendar.monthGrid(2020, 1)).toStrictEqual([
      [0, 0, 1, 2, 3, 4, 5],
      [6, 7, 8, 9, 10, 11, 12],
      [13, 14, 15, 16, 17, 18, 19],
      [20, 21, 22, 23, 24, 25, 26],
      [27, 28, 29, 30, 31, 0, 0],
    ]));
  test("2020-01 Sunday", () =>
    expect(calendar.monthGrid(2020, 1, 0)).toStrictEqual([
      [0, 0, 0, 1, 2, 3, 4],
      [5, 6, 7, 8, 9, 10, 11],
      [12, 13, 14, 15, 16, 17, 18],
      [19, 20, 21, 22, 23, 24, 25],
      [26, 27, 28, 29, 30, 31, 0],
    ]));
  test("2020-02 Monday", () =>
    expect(calendar.monthGrid(2020, 2, 1)).toStrictEqual([
      [0, 0, 0, 0, 0, 1, 2],
      [3, 4, 5, 6, 7, 8, 9],
      [10, 11, 12, 13, 14, 15, 16],
      [17, 18, 19, 20, 21, 22, 23],
      [24, 25, 26, 27, 28, 29, 0],
    ]));
});

describe("previousYear()", () => {
  test("2020", () => expect(calendar.previousYear(2020)).toBe(2019));
  test("2019", () => expect(calendar.previousYear(2019)).toBe(2018));
});

describe("previousMonth()", () => {
  test("2020-01", () =>
    expect(calendar.previousMonth(2020, 1)).toStrictEqual([2019, 12]));
  test("2020-02", () =>
    expect(calendar.previousMonth(2020, 2)).toStrictEqual([2020, 1]));
});

describe("previousDay()", () => {
  test("2020-01-01", () =>
    expect(calendar.previousDay(2020, 1, 1)).toStrictEqual([2019, 12, 31]));
  test("2020-01-02", () =>
    expect(calendar.previousDay(2020, 1, 2)).toStrictEqual([2020, 1, 1]));
  test("2020-03-01", () =>
    expect(calendar.previousDay(2020, 3, 1)).toStrictEqual([2020, 2, 29]));
});

describe("nextYear()", () => {
  test("2020", () => expect(calendar.nextYear(2020)).toBe(2021));
  test("2019", () => expect(calendar.nextYear(2019)).toBe(2020));
});

describe("nextMonth()", () => {
  test("2020-11", () =>
    expect(calendar.nextMonth(2020, 11)).toStrictEqual([2020, 12]));
  test("2020-12", () =>
    expect(calendar.nextMonth(2020, 12)).toStrictEqual([2021, 1]));
});

describe("nextDay()", () => {
  test("2019-12-31", () =>
    expect(calendar.nextDay(2019, 12, 31)).toStrictEqual([2020, 1, 1]));
  test("2020-01-01", () =>
    expect(calendar.nextDay(2020, 1, 1)).toStrictEqual([2020, 1, 2]));
  test("2020-02-28", () =>
    expect(calendar.nextDay(2020, 2, 28)).toStrictEqual([2020, 2, 29]));
  test("2020-02-29", () =>
    expect(calendar.nextDay(2020, 2, 29)).toStrictEqual([2020, 3, 1]));
});

describe("sinceEpochYmd()", () => {
  test("2020-02-02 -> 2020-02-01", () =>
    expect(calendar.sinceEpochYmd([2020, 2, 2], [2020, 2, 1])).toStrictEqual([
      0,
      0,
      0,
    ]));
  test("2020-02-02 -> 2020-01-01", () =>
    expect(calendar.sinceEpochYmd([2020, 2, 2], [2020, 1, 1])).toStrictEqual([
      0,
      0,
      0,
    ]));
  test("2020-02-02 -> 2019-01-01", () =>
    expect(calendar.sinceEpochYmd([2020, 2, 2], [2019, 1, 1])).toStrictEqual([
      0,
      0,
      0,
    ]));
  test("2020-01-01 -> 2020-01-01", () =>
    expect(calendar.sinceEpochYmd([2020, 1, 1], [2020, 1, 1])).toStrictEqual([
      0,
      0,
      0,
    ]));
  test("2020-01-01 -> 2020-01-02", () =>
    expect(calendar.sinceEpochYmd([2020, 1, 1], [2020, 1, 2])).toStrictEqual([
      0,
      0,
      1,
    ]));
  test("2019-01-01 -> 2020-01-01", () =>
    expect(calendar.sinceEpochYmd([2019, 1, 1], [2020, 1, 1])).toStrictEqual([
      1,
      0,
      0,
    ]));
  test("2019-01-01 -> 2021-01-01", () =>
    expect(calendar.sinceEpochYmd([2019, 1, 1], [2021, 1, 1])).toStrictEqual([
      2,
      0,
      0,
    ]));
  test("2019-01-01 -> 2021-03-01", () =>
    expect(calendar.sinceEpochYmd([2019, 1, 1], [2021, 3, 1])).toStrictEqual([
      2,
      2,
      0,
    ]));
  test("2019-01-02 -> 2021-03-01", () =>
    expect(calendar.sinceEpochYmd([2019, 1, 2], [2021, 3, 1])).toStrictEqual([
      2,
      1,
      27,
    ]));
  test("2020-02-20 -> 2021-03-20", () =>
    expect(calendar.sinceEpochYmd([2020, 2, 20], [2021, 3, 20])).toStrictEqual([
      1,
      1,
      0,
    ]));
  test("1980-06-01 -> 2021-03-20", () =>
    expect(calendar.sinceEpochYmd([1980, 6, 1], [2021, 3, 20])).toStrictEqual([
      40,
      9,
      19,
    ]));
});

describe("daysSinceEpoch()", () => {
  test("2020-01-01 -> 2020-01-01", () =>
    expect(calendar.daysSinceEpoch([2020, 1, 1], [2020, 1, 1])).toBe(0));
  test("2020-01-01 -> 2020-01-02", () =>
    expect(calendar.daysSinceEpoch([2020, 1, 1], [2020, 1, 2])).toBe(1));
  test("2019-01-01 -> 2020-01-01", () =>
    expect(calendar.daysSinceEpoch([2019, 1, 1], [2020, 1, 1])).toBe(365));
  test("2019-01-01 -> 2021-01-01", () =>
    expect(calendar.daysSinceEpoch([2019, 1, 1], [2021, 1, 1])).toBe(731));
  test("2020-02-20 -> 2021-03-20", () =>
    expect(calendar.daysSinceEpoch([2020, 2, 20], [2021, 3, 20])).toBe(394));
  test("1980-06-01 -> 2021-03-20", () =>
    expect(calendar.daysSinceEpoch([1980, 6, 1], [2021, 3, 20])).toBe(14902));
});
