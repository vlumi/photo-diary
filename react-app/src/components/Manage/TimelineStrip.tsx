// Sidebar month-picker timeline for Manage Photos. One row per
// year that has photos in the currently-filtered set; clicking a
// year expands twelve month cells. Picking a month sets the
// dateFrom / dateTo pair (first → last day of month); clicking
// the same active month again clears the range.
//
// Buckets come from `photosService.getYearMonths(filter)` minus
// the dateFrom / dateTo (the timeline shouldn't narrow itself),
// so the strip recomputes as the operator toggles other chips.
import React from "react";
import styled from "@emotion/styled";
import { useTranslation } from "react-i18next";

import type { YearMonthBucket } from "../../services/photos";

const Root = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`;
const YearRow = styled.button<{ $expanded: boolean }>`
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: center;
  gap: 8px;
  padding: 4px 6px;
  background: ${({ $expanded }) =>
    $expanded ? "var(--tile-background)" : "transparent"};
  color: var(--primary-color);
  border: 1px solid transparent;
  border-radius: 4px;
  font: inherit;
  cursor: pointer;
  text-align: left;
  &:hover {
    border-color: var(--inactive-color);
  }
`;
const YearLabel = styled.span`
  font-weight: bold;
  font-size: 0.9em;
`;
const YearCount = styled.span`
  font-size: 0.8em;
  color: var(--inactive-color);
`;
const MonthGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 2px;
  padding: 2px 0 6px;
`;
const MonthCell = styled.button<{
  $present: boolean;
  $active: boolean;
}>`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4px 0;
  gap: 1px;
  background: ${({ $active }) =>
    $active ? "var(--header-background)" : "transparent"};
  color: ${({ $present, $active }) =>
    $active
      ? "var(--header-color)"
      : $present
        ? "var(--primary-color)"
        : "var(--inactive-color)"};
  border: 1px solid
    ${({ $active }) =>
      $active ? "var(--header-background)" : "var(--inactive-color)"};
  border-radius: 3px;
  font: inherit;
  font-size: 0.75em;
  cursor: ${({ $present }) => ($present ? "pointer" : "default")};
  opacity: ${({ $present }) => ($present ? 1 : 0.45)};
  &:hover {
    border-color: ${({ $present, $active }) =>
      $active || !$present
        ? undefined
        : "var(--primary-color)"};
  }
`;
const MonthLabel = styled.span`
  font-weight: bold;
`;
const MonthCount = styled.span`
  font-size: 0.85em;
  opacity: 0.85;
`;
const Empty = styled.p`
  margin: 0;
  font-size: 0.85em;
  font-style: italic;
  color: var(--inactive-color);
`;

interface Props {
  buckets: YearMonthBucket[];
  dateFrom: string | null;
  dateTo: string | null;
  onPickMonth: (
    yearMonth: string,
    range: { dateFrom: string; dateTo: string } | null
  ) => void;
}

// Last day of a given (year, month) — used to set the inclusive
// dateTo when the operator picks a month. Day 0 of next month
// = last day of current month.
const lastDayOfMonth = (year: number, month: number): number =>
  new Date(year, month, 0).getDate();

const padTwo = (n: number): string => String(n).padStart(2, "0");

// Build `<dateFrom, dateTo>` for the picked year-month bucket,
// inclusive on both ends. Uses YYYY-MM-DD strings since that's
// what `<input type="date">` and the server's filter both expect.
const monthRange = (
  yearMonth: string
): { dateFrom: string; dateTo: string } => {
  const [yearStr, monthStr] = yearMonth.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);
  const last = lastDayOfMonth(year, month);
  return {
    dateFrom: `${yearStr}-${monthStr}-01`,
    dateTo: `${yearStr}-${monthStr}-${padTwo(last)}`,
  };
};

const TimelineStrip = ({
  buckets,
  dateFrom,
  dateTo,
  onPickMonth,
}: Props): React.ReactElement => {
  const { t } = useTranslation();
  const [expandedYear, setExpandedYear] = React.useState<number | null>(null);

  // Sum counts by year for the collapsed-row badge, and remember
  // which months actually have photos so the 12-cell grid greys
  // out empty months (still visible — gives the operator a
  // glance at coverage gaps).
  const yearSummaries = React.useMemo(() => {
    const map = new Map<number, { total: number; months: Map<number, number> }>();
    for (const b of buckets) {
      const [yearStr, monthStr] = b.yearMonth.split("-");
      const year = Number(yearStr);
      const month = Number(monthStr);
      let entry = map.get(year);
      if (!entry) {
        entry = { total: 0, months: new Map() };
        map.set(year, entry);
      }
      entry.total += b.count;
      entry.months.set(month, b.count);
    }
    return Array.from(map.entries())
      .map(([year, entry]) => ({ year, ...entry }))
      .sort((a, b) => b.year - a.year);
  }, [buckets]);

  // Auto-expand the year that matches the current date range so
  // the active month cell stays visible without a manual click.
  const activeYearMonth = React.useMemo(() => {
    if (!dateFrom || !dateTo) return null;
    if (dateFrom.length < 7 || dateTo.length < 7) return null;
    if (dateFrom.slice(0, 7) !== dateTo.slice(0, 7)) return null;
    return dateFrom.slice(0, 7);
  }, [dateFrom, dateTo]);

  React.useEffect(() => {
    if (!activeYearMonth) return;
    const year = Number(activeYearMonth.slice(0, 4));
    setExpandedYear((prev) => (prev === year ? prev : year));
  }, [activeYearMonth]);

  if (yearSummaries.length === 0) {
    return <Empty>{t("manage-photos-timeline-empty")}</Empty>;
  }

  return (
    <Root>
      {yearSummaries.map((y) => {
        const expanded = expandedYear === y.year;
        return (
          <React.Fragment key={y.year}>
            <YearRow
              type="button"
              $expanded={expanded}
              onClick={() => setExpandedYear(expanded ? null : y.year)}
              title={String(
                t("manage-photos-timeline-year-title", {
                  year: y.year,
                  count: y.total,
                })
              )}
            >
              <YearLabel>{y.year}</YearLabel>
              <YearCount>{y.total}</YearCount>
            </YearRow>
            {expanded && (
              <MonthGrid>
                {Array.from({ length: 12 }, (_, i) => {
                  const month = i + 1;
                  const yearMonth = `${y.year}-${padTwo(month)}`;
                  const count = y.months.get(month) ?? 0;
                  const present = count > 0;
                  const active = activeYearMonth === yearMonth;
                  return (
                    <MonthCell
                      key={month}
                      type="button"
                      $present={present}
                      $active={active}
                      disabled={!present}
                      onClick={() => {
                        if (!present) return;
                        if (active) {
                          onPickMonth(yearMonth, null);
                        } else {
                          onPickMonth(yearMonth, monthRange(yearMonth));
                        }
                      }}
                      title={String(
                        t("manage-photos-timeline-month-title", {
                          month: t(`month-long-${month}`),
                          year: y.year,
                          count,
                        })
                      )}
                    >
                      <MonthLabel>{t(`month-short-${month}`)}</MonthLabel>
                      {present && <MonthCount>{count}</MonthCount>}
                    </MonthCell>
                  );
                })}
              </MonthGrid>
            )}
          </React.Fragment>
        );
      })}
    </Root>
  );
};

export default TimelineStrip;
