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
  // Years are independently expand/collapse-able so a cross-year
  // range (April 2023 → May 2024 etc.) stays visible at a glance
  // — without this the operator can only see the half of the
  // range that lives in whichever year happens to be expanded.
  const [expandedYears, setExpandedYears] = React.useState<Set<number>>(
    () => new Set()
  );
  const toggleYear = (year: number) => {
    setExpandedYears((prev) => {
      const next = new Set(prev);
      if (next.has(year)) next.delete(year);
      else next.add(year);
      return next;
    });
  };

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
      .sort((a, b) => a.year - b.year);
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

  // Two-tap range anchor. First tap sets the anchor + single-month
  // range; subsequent taps either extend from the anchor, swap the
  // anchor to the non-anchor endpoint, or clear. Mirrors how date-
  // range pickers work on touchscreens where shift-click isn't an
  // option. Defaults to dateFrom's YYYY-MM when the component mounts
  // mid-range (operator just arrived with a URL-encoded range).
  const initialAnchorYM = dateFrom ? dateFrom.slice(0, 7) : null;
  const [anchorYM, setAnchorYM] = React.useState<string | null>(
    initialAnchorYM
  );
  // Parent cleared the range externally (e.g. the Clear link in the
  // date row) → drop the anchor so the next tap starts fresh.
  React.useEffect(() => {
    if (!dateFrom && !dateTo) setAnchorYM(null);
  }, [dateFrom, dateTo]);
  // First / last YYYY-MM of the active range — used to detect a tap
  // on the non-anchor endpoint of a multi-month range, which swaps
  // the anchor to that endpoint.
  const rangeEnds = React.useMemo<
    { firstYM: string; lastYM: string } | null
  >(() => {
    if (!dateFrom || !dateTo) return null;
    const firstYM = dateFrom.slice(0, 7);
    const lastYM = dateTo.slice(0, 7);
    if (firstYM === lastYM) return null;
    return { firstYM, lastYM };
  }, [dateFrom, dateTo]);

  // Track range changes via a stable string key so the effect
  // fires once per change (rather than on every Set identity
  // shift). Empty range → no auto-expansion decision.
  const rangeKey = dateFrom && dateTo ? `${dateFrom}|${dateTo}` : "";
  React.useEffect(() => {
    if (!rangeKey) return;
    const next = new Set<number>();
    for (const ym of activeMonths) next.add(Number(ym.slice(0, 4)));
    // Replace the expanded set: every year in the range stays
    // open; years not in the range close. Manually opened years
    // between range changes are intentionally cleared on the
    // next selection — the operator's mental model is "the
    // timeline shows my current range expanded".
    setExpandedYears(next);
    // activeMonths is derived from dateFrom/dateTo; rangeKey is
    // sufficient to trigger this effect exactly once per change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rangeKey]);

  if (yearSummaries.length === 0) {
    return <Empty>{t("manage-photos-timeline-empty")}</Empty>;
  }

  return (
    <Root>
      {yearSummaries.map((y) => {
        const expanded = expandedYears.has(y.year);
        return (
          <React.Fragment key={y.year}>
            <YearRow
              type="button"
              $expanded={expanded}
              onClick={() => toggleYear(y.year)}
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
                    // Shift-click extends the current range to
                    // cover the clicked month, ignoring the anchor.
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
                    if (singleActiveYearMonth === yearMonth) {
                      setAnchorYM(null);
                      onPickMonth(yearMonth, null);
                      return;
                    }
                    // Plain click on the non-anchor endpoint of a
                    // multi-month range → move the anchor here and
                    // collapse the range to this month. Subsequent
                    // taps then extend from the new anchor.
                    if (
                      rangeEnds &&
                      anchorYM &&
                      yearMonth !== anchorYM &&
                      (yearMonth === rangeEnds.firstYM ||
                        yearMonth === rangeEnds.lastYM)
                    ) {
                      setAnchorYM(yearMonth);
                      onPickMonth(yearMonth, clicked);
                      return;
                    }
                    // Plain click with an existing anchor → extend
                    // the range from the anchor to the clicked
                    // month, anchor stays put.
                    if (anchorYM && anchorYM !== yearMonth) {
                      const anchored = monthRange(anchorYM);
                      const newFrom =
                        anchored.dateFrom < clicked.dateFrom
                          ? anchored.dateFrom
                          : clicked.dateFrom;
                      const newTo =
                        anchored.dateTo > clicked.dateTo
                          ? anchored.dateTo
                          : clicked.dateTo;
                      onPickMonth(yearMonth, {
                        dateFrom: newFrom,
                        dateTo: newTo,
                      });
                      return;
                    }
                    // No anchor yet → set the anchor + single-month
                    // range to the clicked month.
                    setAnchorYM(yearMonth);
                    onPickMonth(yearMonth, clicked);
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
