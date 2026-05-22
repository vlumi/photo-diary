import { create } from "zustand";

import type { Filters } from "../lib/filter";

interface FiltersState {
  filters: Filters;
  setFilters: (filters: Filters) => void;
}

// Filter state lives at the app level so the Filters panel and the
// gallery subviews can stay in sync without prop-drilling through the
// Gallery shell. No persistence — filters reset on reload by design.
export const useFiltersStore = create<FiltersState>((set) => ({
  filters: {},
  setFilters: (filters) => set({ filters }),
}));
