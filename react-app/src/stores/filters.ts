import { useMemo } from "react";
import { create } from "zustand";

import type { Filters } from "../lib/filter";

// Date-range filter sibling of `filters` (mirrors the server's
// `DateRange` shape). Half-open allowed: either bound undefined /
// empty string means "no constraint on that side".
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

// Numeric range filter sibling of `filters` / `dateRange` (#264).
// Keyed by kebab-case category name (focal-length / aperture /
// exposure-time / iso / ev / lv); each entry carries half-open
// `{min?, max?}` bounds. `anchor` is a UI-only hint that marks
// which endpoint is the "fixed" one — the picker uses it so a
// subsequent click moves the OTHER end, giving the operator
// predictable shrink-vs-extend semantics. Server doesn't see it.
export interface NumericRange {
  min?: number;
  max?: number;
  anchor?: "min" | "max";
}
export type NumericRanges = Record<string, NumericRange>;
export const isBoundedNumericRange = (range: NumericRange | undefined): boolean =>
  !!range && (range.min !== undefined || range.max !== undefined);

// Drop entries with no bounds AND strip the client-only `anchor`
// field so the wire payload matches the server's strict
// FilterShape schema (additionalProperties: false). Keeps the
// React Query key stable when activating a card with no bounds.
export const toWireNumericRanges = (ranges: NumericRanges): NumericRanges => {
  const out: NumericRanges = {};
  for (const [cat, range] of Object.entries(ranges)) {
    if (isBoundedNumericRange(range)) {
      const wire: NumericRange = {};
      if (range.min !== undefined) wire.min = range.min;
      if (range.max !== undefined) wire.max = range.max;
      out[cat] = wire;
    }
  }
  return out;
};

interface FiltersState {
  filters: Filters;
  dateRange: DateRange | undefined;
  numericRanges: NumericRanges;
  setFilters: (filters: Filters) => void;
  setDateRange: (dateRange: DateRange | undefined) => void;
  setNumericRange: (category: string, range: NumericRange | undefined) => void;
  setNumericRanges: (ranges: NumericRanges) => void;
}

// Filter state lives at the app level so the Filters panel and the
// gallery subviews can stay in sync without prop-drilling through the
// Gallery shell. No persistence — filters reset on reload by design.
export const useFiltersStore = create<FiltersState>((set) => ({
  filters: {},
  dateRange: undefined,
  numericRanges: {},
  setFilters: (filters) => set({ filters }),
  setDateRange: (dateRange) => set({ dateRange }),
  setNumericRange: (category, range) =>
    set((state) => {
      const next = { ...state.numericRanges };
      if (range === undefined) {
        delete next[category];
      } else {
        next[category] = range;
      }
      return { numericRanges: next };
    }),
  setNumericRanges: (numericRanges) => set({ numericRanges }),
}));

// Memoised wire shape of the active numeric ranges — what every
// server query / request body should actually send. Strips the
// client-only `anchor` field and drops entries with no bounds, so
// the query key stays stable when the operator opens a card but
// hasn't picked a value yet.
export const useWireNumericRanges = (): NumericRanges => {
  const numericRanges = useFiltersStore((s) => s.numericRanges);
  return useMemo(() => toWireNumericRanges(numericRanges), [numericRanges]);
};
