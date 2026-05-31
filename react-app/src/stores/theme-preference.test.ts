import { beforeEach, expect, test, vi } from "vitest";

import { useThemePreferenceStore } from "./theme-preference";

const VALID = new Set(["blue", "red", "grayscale"]);

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
  useThemePreferenceStore.setState({ preference: null });
});

test("setPreference persists and updates state", () => {
  useThemePreferenceStore.getState().setPreference("blue");
  expect(useThemePreferenceStore.getState().preference).toBe("blue");
  expect(localStorage.getItem("theme-preference")).toBe("blue");
});

test("setPreference(null) clears storage", () => {
  useThemePreferenceStore.getState().setPreference("blue");
  useThemePreferenceStore.getState().setPreference(null);
  expect(useThemePreferenceStore.getState().preference).toBeNull();
  expect(localStorage.getItem("theme-preference")).toBeNull();
});

test("load reads from storage when the value is in the valid set", () => {
  localStorage.setItem("theme-preference", "red");
  useThemePreferenceStore.getState().load(VALID);
  expect(useThemePreferenceStore.getState().preference).toBe("red");
});

test("load discards stale values not in the valid set", () => {
  localStorage.setItem("theme-preference", "removed-theme");
  useThemePreferenceStore.getState().load(VALID);
  expect(useThemePreferenceStore.getState().preference).toBeNull();
});
