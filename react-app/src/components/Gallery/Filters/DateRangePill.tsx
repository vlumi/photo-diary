import React from "react";
import styled from "@emotion/styled";
import { useTranslation } from "react-i18next";
import { BsFillXCircleFill } from "react-icons/bs";

import { useFiltersStore, type DateRange } from "../../../stores/filters";

// Mirrors Category's wrapper styling so the pill reads as a peer
// of Year / Month / Weekday inside the Time topic — same rounding,
// padding, margin, no extra border (the original border-1 made the
// edges look fuzzier than the other pills).
const Pill = styled.div`
  display: inline-flex;
  align-items: center;
  padding: 2px 5px;
  margin: 0 5px;
  border-radius: 15px;
  background-color: var(--header-background);
  color: var(--header-color);
`;
const Label = styled.span`
  padding: 0 5px;
  font-style: italic;
`;
const DateInput = styled.input`
  font: inherit;
  font-size: 0.9em;
  padding: 1px 4px;
  margin: 0 2px;
  background: var(--primary-background);
  color: var(--primary-color);
  border: 1px solid var(--inactive-color);
  border-radius: 4px;
`;
const ClearIcon = styled(BsFillXCircleFill)`
  cursor: pointer;
`;

// Date-range filter pill. Shown iff `useFiltersStore.dateRange` is
// defined — activation lives in the Time-topic adder dropdown
// (`Filters/index.tsx`), not in this component, so the filter bar
// has a single "+" entry point. Cleared via the X button on the
// pill, which deactivates back to undefined.
const DateRangePill = (): React.ReactElement | null => {
  const { t } = useTranslation();
  const dateRange = useFiltersStore((s) => s.dateRange);
  const setDateRange = useFiltersStore((s) => s.setDateRange);

  if (!dateRange) return null;

  const set = (next: DateRange) => setDateRange(next);
  return (
    <Pill>
      <Label>{t("filters-date-range-from")}</Label>
      <DateInput
        type="date"
        value={dateRange.from ?? ""}
        onChange={(e) =>
          set({ ...dateRange, from: e.target.value || undefined })
        }
      />
      <Label>{t("filters-date-range-to")}</Label>
      <DateInput
        type="date"
        value={dateRange.to ?? ""}
        onChange={(e) =>
          set({ ...dateRange, to: e.target.value || undefined })
        }
      />
      <ClearIcon
        onClick={() => setDateRange(undefined)}
        aria-label={t("filters-date-range-clear")}
        title={t("filters-date-range-clear")}
      />
    </Pill>
  );
};
export default DateRangePill;
