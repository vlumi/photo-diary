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

// Every YYYY-MM bucket touched by the given date range. Walks
// month by month so multi-year ranges still light up correctly.
const monthsInRange = (
  dateFrom: string | null,
  dateTo: string | null
): Set<string> => {
  const out = new Set<string>();
  if (!dateFrom || !dateTo) return out;
  if (dateFrom.length < 7 || dateTo.length < 7) return out;
  const [startY, startM] = dateFrom.slice(0, 7).split("-").map(Number);
  const [endY, endM] = dateTo.slice(0, 7).split("-").map(Number);
  if (
    Number.isNaN(startY) ||
    Number.isNaN(startM) ||
    Number.isNaN(endY) ||
    Number.isNaN(endM)
  )
    return out;
  let y = startY;
  let m = startM;
  while (y < endY || (y === endY && m <= endM)) {
    out.add(`${y}-${padTwo(m)}`);
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }
  return out;
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

  // Every YYYY-MM bucket inside the current date range. Single-
  // month range → one entry; shift-click extended range → many.
  // Drives the active-cell highlight and the "is this the exact
  // single-month selection?" toggle check below.
  const activeMonths = React.useMemo(
    () => monthsInRange(dateFrom, dateTo),
    [dateFrom, dateTo]
  );
  const singleActiveYearMonth = React.useMemo(() => {
    if (activeMonths.size !== 1) return null;
    return activeMonths.values().next().value as string;
  }, [activeMonths]);

  // Auto-expand the year that matches the current single-month
  // selection so the cell stays visible without a manual click.
  // For multi-month ranges, leave the expanded year alone — the
  // operator may be drilling into a specific year of a multi-year
  // span.
  React.useEffect(() => {
    if (!singleActiveYearMonth) return;
    const year = Number(singleActiveYearMonth.slice(0, 4));
    setExpandedYear((prev) => (prev === year ? prev : year));
  }, [singleActiveYearMonth]);

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
                  const active = activeMonths.has(yearMonth);
                  const onClick = (e: React.MouseEvent) => {
                    if (!present) return;
                    const clicked = monthRange(yearMonth);
                    // Shift-click extends an existing range to
                    // cover the clicked month. Without an active
                    // range, falls through to the plain-click
                    // (set single month) path so it isn't a
                    // no-op for the first click in a span.
                    if (e.shiftKey && dateFrom && dateTo) {
                      const newFrom =
                        dateFrom < clicked.dateFrom ? dateFrom : clicked.dateFrom;
                      const newTo =
                        dateTo > clicked.dateTo ? dateTo : clicked.dateTo;
                      onPickMonth(yearMonth, {
                        dateFrom: newFrom,
                        dateTo: newTo,
                      });
                      return;
                    }
                    // Plain click on the only active month → clear.
                    // Otherwise → replace the range with just this
                    // month (works for both "no range" and "clicked
                    // inside a multi-month span" cases).
                    if (singleActiveYearMonth === yearMonth) {
                      onPickMonth(yearMonth, null);
                    } else {
                      onPickMonth(yearMonth, clicked);
                    }
                  };
                  return (
                    <MonthCell
                      key={month}
                      type="button"
                      $present={present}
                      $active={active}
                      disabled={!present}
                      onClick={onClick}
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
