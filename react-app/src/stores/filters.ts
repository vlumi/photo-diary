import { create } from "zustand";

import type { Filters } from "../lib/filter";

// Date-range filter sibling of `filters` (mirrors the server's
// `DateRange` shape from #264). Half-open allowed: either bound
// undefined / empty string means "no constraint on that side".
//
// `dateRange = undefined` means the filter isn't active — pill
// hidden. `dateRange = {}` or `{from: ""}` means the pill is
// active but has no bounds (operator picked "Date range" from the
// Time topic adder and hasn't typed dates yet). Once they type a
// date, `from` and/or `to` carry a `YYYY-MM-DD` string.
export interface DateRange {
  from?: string;
  to?: string;
}
export const isBoundedDateRange = (range: DateRange | undefined): boolean =>
  !!range && (!!range.from || !!range.to);

interface FiltersState {
  filters: Filters;
  dateRange: DateRange | undefined;
  setFilters: (filters: Filters) => void;
  setDateRange: (dateRange: DateRange | undefined) => void;
}

// Filter state lives at the app level so the Filters panel and the
// gallery subviews can stay in sync without prop-drilling through the
// Gallery shell. No persistence — filters reset on reload by design.
export const useFiltersStore = create<FiltersState>((set) => ({
  filters: {},
  dateRange: undefined,
  setFilters: (filters) => set({ filters }),
  setDateRange: (dateRange) => set({ dateRange }),
}));
