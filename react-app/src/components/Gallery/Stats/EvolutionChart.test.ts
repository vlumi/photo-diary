import { describe, expect, it, afterEach } from "vitest";

import config from "../../../lib/config";
import { compareByWeekday } from "./EvolutionChart";

const sortKeys = (keys: string[]): string[] =>
  [...keys].map((k) => ({ key: k })).sort(compareByWeekday).map((e) => e.key);

describe("compareByWeekday", () => {
  const originalFirst = config.FIRST_WEEKDAY;
  afterEach(() => {
    config.FIRST_WEEKDAY = originalFirst;
  });

  it("Monday-first rotates Sunday to the end", () => {
    config.FIRST_WEEKDAY = 1;
    expect(sortKeys(["0", "1", "2", "3", "4", "5", "6"])).toEqual([
      "1",
      "2",
      "3",
      "4",
      "5",
      "6",
      "0",
    ]);
  });

  it("Sunday-first keeps the raw 0-6 order", () => {
    config.FIRST_WEEKDAY = 0;
    expect(sortKeys(["6", "5", "4", "3", "2", "1", "0"])).toEqual([
      "0",
      "1",
      "2",
      "3",
      "4",
      "5",
      "6",
    ]);
  });

  it("Saturday-first puts Sat first, Sun second", () => {
    config.FIRST_WEEKDAY = 6;
    expect(sortKeys(["0", "1", "2", "3", "4", "5", "6"])).toEqual([
      "6",
      "0",
      "1",
      "2",
      "3",
      "4",
      "5",
    ]);
  });
});
