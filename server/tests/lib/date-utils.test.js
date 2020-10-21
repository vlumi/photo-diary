const { isLeap } = require("../../lib/date-utils.cjs");

describe("Invalid year", () => {
  test("isLeap of undefined", () => expect(isLeap(undefined)).toBe(undefined));
  test("isLeap of 0", () => expect(isLeap(0)).toBe(undefined));
});
describe("Leap year", () => {
  test("isLeap of 1600", () => expect(isLeap(1600)).toBe(true));
  test("isLeap of 1988", () => expect(isLeap(1988)).toBe(true));
  test("isLeap of 1992", () => expect(isLeap(1992)).toBe(true));
  test("isLeap of 1996", () => expect(isLeap(1996)).toBe(true));
  test("isLeap of 2000", () => expect(isLeap(2000)).toBe(true));
  test("isLeap of 2000", () => expect(isLeap(2004)).toBe(true));
  test("isLeap of 2020", () => expect(isLeap(2020)).toBe(true));
  test("isLeap of 2024", () => expect(isLeap(2024)).toBe(true));
  test("isLeap of 2024", () => expect(isLeap(2400)).toBe(true));
});
describe("Not a leap year", () => {
  test("isLeap of 1900", () => expect(isLeap(1900)).toBe(false));
  test("isLeap of 1989", () => expect(isLeap(1989)).toBe(false));
  test("isLeap of 1990", () => expect(isLeap(1990)).toBe(false));
  test("isLeap of 1991", () => expect(isLeap(1991)).toBe(false));
  test("isLeap of 1993", () => expect(isLeap(1993)).toBe(false));
  test("isLeap of 1994", () => expect(isLeap(1994)).toBe(false));
  test("isLeap of 1995", () => expect(isLeap(1995)).toBe(false));
  test("isLeap of 1997", () => expect(isLeap(1997)).toBe(false));
  test("isLeap of 1998", () => expect(isLeap(1998)).toBe(false));
  test("isLeap of 1999", () => expect(isLeap(1999)).toBe(false));
  test("isLeap of 2019", () => expect(isLeap(2019)).toBe(false));
  test("isLeap of 2021", () => expect(isLeap(2021)).toBe(false));
  test("isLeap of 2022", () => expect(isLeap(2022)).toBe(false));
  test("isLeap of 2023", () => expect(isLeap(2023)).toBe(false));
  test("isLeap of 2100", () => expect(isLeap(2100)).toBe(false));
});
