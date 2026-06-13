import { create } from "zustand";

const STORAGE_KEY = "evolution-granularity";
export type EvolutionGranularity = "month" | "year";

const isValid = (v: string | null): v is EvolutionGranularity =>
  v === "month" || v === "year";

const read = (): EvolutionGranularity => {
  if (typeof window === "undefined" || !window.localStorage) return "month";
  const raw = window.localStorage.getItem(STORAGE_KEY);
  return isValid(raw) ? raw : "month";
};
const write = (value: EvolutionGranularity) => {
  if (typeof window === "undefined" || !window.localStorage) return;
  window.localStorage.setItem(STORAGE_KEY, value);
};

interface State {
  granularity: EvolutionGranularity;
  setGranularity: (next: EvolutionGranularity) => void;
}

export const useEvolutionGranularityStore = create<State>((set) => ({
  granularity: read(),
  setGranularity: (granularity) => {
    write(granularity);
    set({ granularity });
  },
}));
