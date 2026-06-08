import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import {
  _resetForTests,
  cacheGet,
  cacheSet,
  invalidateAllGalleries,
  invalidateGallery,
} from "../../lib/stats-cache.js";

beforeEach(() => {
  _resetForTests();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("cacheGet / cacheSet", () => {
  test("stores and retrieves by key", () => {
    cacheSet("gallery1", { total: 42 });
    expect(cacheGet("gallery1")).toEqual({ total: 42 });
  });

  test("missing key returns undefined", () => {
    expect(cacheGet("nope")).toBeUndefined();
  });

  test("set overwrites previous value", () => {
    cacheSet("gallery1", { total: 1 });
    cacheSet("gallery1", { total: 2 });
    expect(cacheGet("gallery1")).toEqual({ total: 2 });
  });

  test("TTL expiry drops entries silently", () => {
    vi.useFakeTimers();
    cacheSet("gallery1", { total: 1 });
    // 5-minute TTL + 1ms past
    vi.advanceTimersByTime(5 * 60 * 1000 + 1);
    expect(cacheGet("gallery1")).toBeUndefined();
  });

  test("entry within TTL still served", () => {
    vi.useFakeTimers();
    cacheSet("gallery1", { total: 1 });
    vi.advanceTimersByTime(4 * 60 * 1000);
    expect(cacheGet("gallery1")).toEqual({ total: 1 });
  });
});

describe("invalidateGallery", () => {
  test("removes the keyed entry", () => {
    cacheSet("gallery1", { total: 1 });
    cacheSet("gallery2", { total: 2 });
    invalidateGallery("gallery1");
    expect(cacheGet("gallery1")).toBeUndefined();
    expect(cacheGet("gallery2")).toEqual({ total: 2 });
  });

  test("no-op on a missing key", () => {
    invalidateGallery("nope");
    expect(cacheGet("nope")).toBeUndefined();
  });
});

describe("invalidateAllGalleries", () => {
  test("drops everything", () => {
    cacheSet("a", 1);
    cacheSet("b", 2);
    invalidateAllGalleries();
    expect(cacheGet("a")).toBeUndefined();
    expect(cacheGet("b")).toBeUndefined();
  });
});
