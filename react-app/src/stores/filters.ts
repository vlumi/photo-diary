import { create } from "zustand";

import type { Filters } from "../lib/filter";

// Date-range filter sibling of `filters` (mirrors the server's
// `DateRange` shape from #264). Half-open allowed: either bound
// undefined or empty means "no constraint on that side". The empty
// state (both undefined or both empty) means "no date filter".
export interface DateRange {
  from?: string;
  to?: string;
}
export const isEmptyDateRange = (range: DateRange | undefined): boolean =>
  !range || (!range.from && !range.to);

interface FiltersState {
  filters: Filters;
  dateRange: DateRange;
  setFilters: (filters: Filters) => void;
  setDateRange: (dateRange: DateRange) => void;
}

// Filter state lives at the app level so the Filters panel and the
// gallery subviews can stay in sync without prop-drilling through the
// Gallery shell. No persistence — filters reset on reload by design.
export const useFiltersStore = create<FiltersState>((set) => ({
  filters: {},
  dateRange: {},
  setFilters: (filters) => set({ filters }),
  setDateRange: (dateRange) => set({ dateRange }),
}));
