import { create } from "zustand";

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
