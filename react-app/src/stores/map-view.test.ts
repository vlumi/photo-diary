import { beforeEach, expect, test, vi } from "vitest";

import { useMapViewStore, type SavedView } from "./map-view";

const memoryStorage = (): Storage => {
  let store: Record<string, string> = {};
  return {
    get length() {
      return Object.keys(store).length;
    },
    clear: () => {
      store = {};
    },
    getItem: (key: string) => (key in store ? store[key] : null),
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    key: (i: number) => Object.keys(store)[i] ?? null,
  };
};

beforeEach(() => {
  vi.stubGlobal("localStorage", memoryStorage());
  useMapViewStore.setState({ views: {} });
});

const sample = (overrides: Partial<SavedView> = {}): SavedView => ({
  lat: 35.68,
  lng: 139.76,
  zoom: 14,
  contextId: "gallery1",
  savedAt: 1_700_000_000_000,
  ...overrides,
});

test("saveView persists to localStorage and updates state", () => {
  useMapViewStore.getState().saveView("stats-location:gallery1", sample());
  expect(useMapViewStore.getState().views["stats-location:gallery1"]).toEqual(
    sample()
  );
  const raw = localStorage.getItem("map-view");
  expect(raw).not.toBeNull();
  const parsed = JSON.parse(raw!) as Record<string, SavedView>;
  expect(parsed["stats-location:gallery1"]).toEqual(sample());
});

test("getView returns saved view when contextId matches", () => {
  useMapViewStore.getState().saveView("stats-location:gallery1", sample());
  const got = useMapViewStore
    .getState()
    .getView("stats-location:gallery1", "gallery1");
  expect(got).toEqual(sample());
});

test("getView returns undefined when contextId differs", () => {
  useMapViewStore.getState().saveView("stats-location:gallery1", sample());
  const got = useMapViewStore
    .getState()
    .getView("stats-location:gallery1", "gallery2");
  expect(got).toBeUndefined();
});

test("getView returns undefined when surface has no saved view", () => {
  const got = useMapViewStore
    .getState()
    .getView("stats-location:gallery1", "gallery1");
  expect(got).toBeUndefined();
});

test("saveView on a second surface preserves the first", () => {
  useMapViewStore.getState().saveView("stats-location:gallery1", sample());
  useMapViewStore.getState().saveView(
    "stats-location:gallery2",
    sample({ contextId: "gallery2", lat: 40.0 })
  );
  const g1 = useMapViewStore
    .getState()
    .getView("stats-location:gallery1", "gallery1");
  const g2 = useMapViewStore
    .getState()
    .getView("stats-location:gallery2", "gallery2");
  expect(g1?.lat).toBe(35.68);
  expect(g2?.lat).toBe(40.0);
});

test("clearAll wipes both storage and state", () => {
  useMapViewStore.getState().saveView("stats-location:gallery1", sample());
  useMapViewStore.getState().clearAll();
  expect(useMapViewStore.getState().views).toEqual({});
  expect(localStorage.getItem("map-view")).toBeNull();
});

test("malformed storage JSON is tolerated (starts empty)", () => {
  localStorage.setItem("map-view", "{not valid");
  useMapViewStore.setState({ views: {} });
  // Reading a fresh view should just return undefined; store remains
  // in a usable state and a subsequent saveView clobbers the bad blob.
  const got = useMapViewStore
    .getState()
    .getView("stats-location:gallery1", "gallery1");
  expect(got).toBeUndefined();
  useMapViewStore.getState().saveView("stats-location:gallery1", sample());
  const raw = localStorage.getItem("map-view");
  expect(raw).not.toBeNull();
  expect(() => JSON.parse(raw!)).not.toThrow();
});
