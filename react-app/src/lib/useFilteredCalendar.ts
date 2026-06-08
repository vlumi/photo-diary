import React from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";

import filter from "./filter";
import galleryPhotosService from "../services/gallery-photos";
import { useFiltersStore } from "../stores";

export interface FilteredCalendar {
  ready: boolean;
  has(year: number, month?: number, day?: number): boolean;
  firstYear(): number | undefined;
  lastYear(): number | undefined;
  isFirstYear(year: number): boolean;
  isLastYear(year: number): boolean;
  previousYear(year: number): number | undefined;
  nextYear(year: number): number | undefined;
  firstMonth(): [number, number] | [undefined, undefined];
  lastMonth(): [number, number] | [undefined, undefined];
  isFirstMonth(year: number, month: number): boolean;
  isLastMonth(year: number, month: number): boolean;
  previousMonth(
    year: number,
    month: number
  ): [number, number] | [undefined, undefined];
  nextMonth(
    year: number,
    month: number
  ): [number, number] | [undefined, undefined];
}

const ymKey = (y: number, m: number): string =>
  `${y}-${String(m).padStart(2, "0")}`;

// Reads /counts (gallery-wide, filter-applied, no year scope) and
// derives the navigation primitives the gallery model used to compute
// in-memory from the filtered photo array. One query per (gallery,
// filter) tuple — shared via TanStack across every component that
// needs it. Loaded state ("ready=false") collapses every navigation
// helper to "empty" so the UI hides the prev/next chrome instead of
// flashing wrong links from stale gallery data.
const useFilteredCalendar = (galleryId: string): FilteredCalendar => {
  const filters = useFiltersStore((s) => s.filters);
  const serverFilters = React.useMemo(
    () => filter.toServerFilters(filters),
    [filters]
  );
  const { data: counts } = useQuery({
    queryKey: ["gallery-photo-counts", galleryId, undefined, serverFilters],
    queryFn: () =>
      galleryPhotosService.getCounts(galleryId, { filter: serverFilters }),
    placeholderData: keepPreviousData,
  });
  return React.useMemo<FilteredCalendar>(() => {
    if (!counts) {
      return {
        ready: false,
        has: () => false,
        firstYear: () => undefined,
        lastYear: () => undefined,
        isFirstYear: () => false,
        isLastYear: () => false,
        previousYear: () => undefined,
        nextYear: () => undefined,
        firstMonth: () => [undefined, undefined],
        lastMonth: () => [undefined, undefined],
        isFirstMonth: () => false,
        isLastMonth: () => false,
        previousMonth: () => [undefined, undefined],
        nextMonth: () => [undefined, undefined],
      };
    }
    const yearSet = new Set<number>();
    const monthSet = new Set<string>();
    const daySet = new Set<string>();
    for (const key of Object.keys(counts)) {
      const [ys, ms, ds] = key.split("-");
      const y = Number(ys);
      const m = Number(ms);
      yearSet.add(y);
      monthSet.add(ymKey(y, m));
      daySet.add(`${ymKey(y, m)}-${ds}`);
    }
    const years = [...yearSet].sort((a, b) => a - b);
    const months = [...monthSet].sort();
    const ymToIdx = new Map(months.map((k, i) => [k, i]));
    return {
      ready: true,
      has: (year, month, day) => {
        if (day !== undefined && month !== undefined) {
          return daySet.has(
            `${ymKey(year, month)}-${String(day).padStart(2, "0")}`
          );
        }
        if (month !== undefined) return monthSet.has(ymKey(year, month));
        return yearSet.has(year);
      },
      firstYear: () => (years.length ? years[0] : undefined),
      lastYear: () => (years.length ? years[years.length - 1] : undefined),
      isFirstYear: (year) => years.length > 0 && year <= years[0],
      isLastYear: (year) => years.length > 0 && year >= years[years.length - 1],
      previousYear: (year) => {
        for (let i = years.length - 1; i >= 0; i--) {
          if (years[i] < year) return years[i];
        }
        return undefined;
      },
      nextYear: (year) => {
        for (let i = 0; i < years.length; i++) {
          if (years[i] > year) return years[i];
        }
        return undefined;
      },
      firstMonth: () => {
        if (!months.length) return [undefined, undefined];
        const [y, m] = months[0].split("-").map(Number);
        return [y, m];
      },
      lastMonth: () => {
        if (!months.length) return [undefined, undefined];
        const [y, m] = months[months.length - 1].split("-").map(Number);
        return [y, m];
      },
      isFirstMonth: (year, month) =>
        months.length > 0 && ymKey(year, month) <= months[0],
      isLastMonth: (year, month) =>
        months.length > 0 && ymKey(year, month) >= months[months.length - 1],
      previousMonth: (year, month) => {
        const idx = ymToIdx.get(ymKey(year, month));
        if (idx === undefined) {
          // Current view is on an empty month — find the largest key
          // strictly before it.
          const key = ymKey(year, month);
          for (let i = months.length - 1; i >= 0; i--) {
            if (months[i] < key) {
              const [y, m] = months[i].split("-").map(Number);
              return [y, m];
            }
          }
          return [undefined, undefined];
        }
        if (idx === 0) return [undefined, undefined];
        const [y, m] = months[idx - 1].split("-").map(Number);
        return [y, m];
      },
      nextMonth: (year, month) => {
        const idx = ymToIdx.get(ymKey(year, month));
        if (idx === undefined) {
          const key = ymKey(year, month);
          for (let i = 0; i < months.length; i++) {
            if (months[i] > key) {
              const [y, m] = months[i].split("-").map(Number);
              return [y, m];
            }
          }
          return [undefined, undefined];
        }
        if (idx === months.length - 1) return [undefined, undefined];
        const [y, m] = months[idx + 1].split("-").map(Number);
        return [y, m];
      },
    };
  }, [counts]);
};

export default useFilteredCalendar;
