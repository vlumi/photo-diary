import { create } from "zustand";

const STORAGE_KEY = "theme-preference";

// `null` = follow gallery / instance default (no override). A string
// is the chosen theme name; validated against the manifest at read
// time so a stale localStorage entry can't break rendering after a
// theme is renamed or removed.
const read = (validNames: Set<string>): string | null => {
  if (typeof window === "undefined" || !window.localStorage) return null;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  return validNames.has(raw) ? raw : null;
};

const write = (value: string | null) => {
  if (typeof window === "undefined" || !window.localStorage) return;
  if (value === null) window.localStorage.removeItem(STORAGE_KEY);
  else window.localStorage.setItem(STORAGE_KEY, value);
};

interface State {
  preference: string | null;
  setPreference: (next: string | null) => void;
  load: (validNames: Set<string>) => void;
}

export const useThemePreferenceStore = create<State>((set) => ({
  preference: null,
  setPreference: (preference) => {
    write(preference);
    set({ preference });
  },
  load: (validNames) => set({ preference: read(validNames) }),
}));
