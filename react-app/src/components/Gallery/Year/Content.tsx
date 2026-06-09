import React from "react";
import styled from "@emotion/styled";
import { keepPreviousData, useQuery } from "@tanstack/react-query";

import Month from "./Month";

import calendar from "../../../lib/calendar";
import filter from "../../../lib/filter";
import galleryPhotosService from "../../../services/gallery-photos";
import useFilteredCalendar from "../../../lib/useFilteredCalendar";
import useMediaQuery from "../../../lib/useMediaQuery";
import { useFiltersStore } from "../../../stores";

import type { Gallery } from "../../../models/GalleryModel";

type ActiveTheme = { get: (name: string) => string };

const Root = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: flex-start;
`;
const Calendar = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: flex-start;
  max-width: 904px;
`;

interface Props {
  children?: React.ReactNode;
  gallery: Gallery;
  year: number;
  theme: ActiveTheme;
}

const EMPTY_COUNTS: Record<string, number> = {};

const Content = ({
  children,
  gallery,
  year,
  theme,
}: Props): React.ReactElement => {
  const filters = useFiltersStore((s) => s.filters);
  const serverFilters = React.useMemo(
    () => filter.toServerFilters(filters),
    [filters]
  );
  // Per-day counts fetched from the server (#406). `keepPreviousData`
  // keeps the heatmap painted while a year / filter change refetches —
  // a chip toggle gets an in-place update, not a loader flash.
  const { data: counts = EMPTY_COUNTS } = useQuery({
    queryKey: ["gallery-photo-counts", gallery.id(), year, serverFilters],
    queryFn: () =>
      galleryPhotosService.getCounts(gallery.id(), {
        filter: serverFilters,
        year,
      }),
    placeholderData: keepPreviousData,
  });
  const maxCount = React.useMemo(() => {
    let max = 0;
    for (const value of Object.values(counts)) {
      if (value > max) max = value;
    }
    return max;
  }, [counts]);
  // Month range (#399). Above the desktop breakpoint the year
  // grid renders all 12 months so the calendar reads as a stable
  // Jan–Dec shape regardless of where the active filter's photos
  // fall; below it clips to the filtered first/last month so the
  // operator's mobile scroll isn't padded with empty tiles. The
  // 900px threshold matches the `Calendar` max-width — above that
  // the full 4-col / 3-row grid fits without forcing a vertical
  // re-flow. `useFilteredCalendar` gives the filter-aware bounds;
  // empty bounds (an empty gallery, or one with no photos under
  // the active filter) collapse to nothing on mobile and a 12-up
  // empty grid on desktop.
  const isWide = useMediaQuery("(min-width: 900px)");
  const cal = useFilteredCalendar(gallery.id());
  const months = React.useMemo(() => {
    if (isWide) return calendar.months(year);
    const [firstYear, firstMonth] = cal.firstMonth();
    const [lastYear, lastMonth] = cal.lastMonth();
    return calendar.months(year, firstYear, firstMonth, lastYear, lastMonth);
  }, [isWide, cal, year]);
  return (
    <>
      {children}
      <Root>
        <Calendar>
          {months.map((month) => (
            <Month
              key={month}
              gallery={gallery}
              year={year}
              month={month}
              counts={counts}
              maxCount={maxCount}
              theme={theme}
            />
          ))}
        </Calendar>
      </Root>
    </>
  );
};
export default Content;
