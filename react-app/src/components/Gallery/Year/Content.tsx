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
  // 900px matches the `Calendar` max-width — the full 4-col / 3-row
  // grid fits without re-flow above it.
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
