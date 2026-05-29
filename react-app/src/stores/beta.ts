import { create } from "zustand";

// Opt-in beta features. Off by default — visitors who never toggle the
// flag see the polished surface only. Toggle lives in `UserMenu` for
// logged-in users; the localStorage key persists across sessions.
//
// Single boolean for now. If multiple beta features ever land together,
// migrate to a feature-keyed Set without changing this store's public
// surface (consumers read `enabled`).
const STORAGE_KEY = "beta-features";

const readInitial = (): boolean => {
  if (typeof window === "undefined" || !window.localStorage) return false;
  return window.localStorage.getItem(STORAGE_KEY) === "1";
};

interface BetaState {
  enabled: boolean;
  setEnabled: (next: boolean) => void;
}

export const useBetaStore = create<BetaState>((set) => ({
  enabled: readInitial(),
  setEnabled: (next: boolean) => {
    set({ enabled: next });
    if (typeof window !== "undefined" && window.localStorage) {
      if (next) window.localStorage.setItem(STORAGE_KEY, "1");
      else window.localStorage.removeItem(STORAGE_KEY);
    }
  },
}));
