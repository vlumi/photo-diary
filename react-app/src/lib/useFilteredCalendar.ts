import React from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";

import filter from "./filter";
import galleryPhotosService from "../services/gallery-photos";
import { useFiltersStore } from "../stores";

import type { ServerFilters } from "./filter";

export interface FilteredCalendar {
  ready: boolean;
  has(year: number, month?: number, day?: number): boolean;
  includesPhotos(): boolean;
  photoCount(): number;
  firstDay(): [number, number, number] | [undefined, undefined, undefined];
  lastDay(): [number, number, number] | [undefined, undefined, undefined];
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

const EMPTY_CALENDAR: FilteredCalendar = {
  ready: false,
  has: () => false,
  includesPhotos: () => false,
  photoCount: () => 0,
  firstDay: () => [undefined, undefined, undefined],
  lastDay: () => [undefined, undefined, undefined],
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

// Build the calendar navigation primitives from a `/counts`
// response. Pure — same input always yields the same object shape.
// Caller decides whether the counts came from a filtered or
// unfiltered query.
const buildCalendar = (
  counts: Record<string, number>
): FilteredCalendar => {
  const yearSet = new Set<number>();
  const monthSet = new Set<string>();
  const daySet = new Set<string>();
  const dayKeys: string[] = [];
  let total = 0;
  for (const [key, count] of Object.entries(counts)) {
    const [ys, ms, ds] = key.split("-");
    const y = Number(ys);
    const m = Number(ms);
    yearSet.add(y);
    monthSet.add(ymKey(y, m));
    daySet.add(`${ymKey(y, m)}-${ds}`);
    dayKeys.push(key);
    total += count;
  }
  const years = [...yearSet].sort((a, b) => a - b);
  const months = [...monthSet].sort();
  const sortedDays = dayKeys.sort();
  const ymToIdx = new Map(months.map((k, i) => [k, i]));
  const parseDay = (
    key: string | undefined
  ): [number, number, number] | [undefined, undefined, undefined] => {
    if (!key) return [undefined, undefined, undefined];
    const [y, m, d] = key.split("-").map(Number);
    return [y, m, d];
  };
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
    includesPhotos: () => sortedDays.length > 0,
    photoCount: () => total,
    firstDay: () => parseDay(sortedDays[0]),
    lastDay: () => parseDay(sortedDays[sortedDays.length - 1]),
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
};

const useCalendarFromCounts = (
  galleryId: string,
  serverFilters: ServerFilters
): FilteredCalendar => {
  const { data: counts } = useQuery({
    queryKey: ["gallery-photo-counts", galleryId, undefined, serverFilters],
    queryFn: () =>
      galleryPhotosService.getCounts(galleryId, { filter: serverFilters }),
    placeholderData: keepPreviousData,
  });
  return React.useMemo<FilteredCalendar>(
    () => (counts ? buildCalendar(counts) : EMPTY_CALENDAR),
    [counts]
  );
};

// Filter-aware calendar. Drives the in-gallery nav chrome
// (prev/next month + year skips, heatmap month-tile clickability)
// so empty-under-filter buckets stay hidden. One query per
// (gallery, filter) tuple — shared via TanStack across every
// component that calls the hook with the same active filter.
const useFilteredCalendar = (galleryId: string): FilteredCalendar => {
  const filters = useFiltersStore((s) => s.filters);
  const serverFilters = React.useMemo(
    () => filter.toServerFilters(filters),
    [filters]
  );
  return useCalendarFromCounts(galleryId, serverFilters);
};

// Unfiltered gallery shape — `firstDay`/`lastDay`/`includesPhotos`/
// `photoCount` regardless of the user's current filter selection.
// Used by callers that want calendar facts about the gallery
// itself (the gallery list's "land on most-recent view" link, the
// in-gallery "this gallery is empty" check). Cached separately
// from the filtered variant so a filter toggle inside one gallery
// doesn't invalidate the gallery-shape cache.
export const useGalleryCalendar = (galleryId: string): FilteredCalendar =>
  useCalendarFromCounts(galleryId, {});

export default useFilteredCalendar;
