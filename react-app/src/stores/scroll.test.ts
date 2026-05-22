import { beforeEach, describe, expect, test } from "vitest";

import { useScrollStore } from "./scroll";

beforeEach(() => {
  useScrollStore.setState({ positions: {}, queue: [] });
});

test("set then get returns the stored position", () => {
  const { set, get } = useScrollStore.getState();
  set("/foo", 42);
  expect(get("/foo")).toBe(42);
});

test("get returns 0 for unknown paths", () => {
  expect(useScrollStore.getState().get("/never")).toBe(0);
});

test("repeated set on the same path keeps a single queue entry", () => {
  const { set } = useScrollStore.getState();
  set("/foo", 1);
  set("/foo", 2);
  set("/foo", 3);
  expect(useScrollStore.getState().get("/foo")).toBe(3);
  expect(useScrollStore.getState().queue).toEqual(["/foo"]);
});

describe("eviction at MAX_HISTORY (10)", () => {
  test("the 11th distinct path evicts the oldest", () => {
    const { set } = useScrollStore.getState();
    for (let i = 1; i <= 10; i++) set(`/p${i}`, i);
    expect(useScrollStore.getState().get("/p1")).toBe(1);
    set("/p11", 11);
    expect(useScrollStore.getState().get("/p1")).toBe(0); // evicted
    expect(useScrollStore.getState().get("/p2")).toBe(2); // still here
    expect(useScrollStore.getState().get("/p11")).toBe(11);
  });

  test("re-visiting a path moves it to the front of the queue", () => {
    const { set } = useScrollStore.getState();
    for (let i = 1; i <= 10; i++) set(`/p${i}`, i);
    // Touch the oldest path so it's no longer the eviction target.
    set("/p1", 100);
    set("/p11", 11);
    expect(useScrollStore.getState().get("/p1")).toBe(100); // saved
    expect(useScrollStore.getState().get("/p2")).toBe(0); // evicted instead
    expect(useScrollStore.getState().get("/p11")).toBe(11);
  });
});
