import React from "react";
import styled from "@emotion/styled";
import { useTranslation } from "react-i18next";
import { BsFillXCircleFill } from "react-icons/bs";

import { useFiltersStore, type DateRange } from "../../../stores/filters";

const Pill = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 6px;
  margin: 2px 2px;
  border-radius: 12px;
  background: var(--header-background);
  color: var(--header-color);
  border: 1px solid var(--inactive-color);
  font-size: 0.85em;
`;
const Label = styled.span`
  font-style: italic;
  font-size: 0.85em;
  color: var(--inactive-color);
  padding: 0 4px;
`;
const DateInput = styled.input`
  font: inherit;
  font-size: 0.85em;
  padding: 1px 4px;
  background: var(--primary-background);
  color: var(--primary-color);
  border: 1px solid var(--inactive-color);
  border-radius: 4px;
`;
const ClearIcon = styled(BsFillXCircleFill)`
  cursor: pointer;
  color: var(--inactive-color);
  &:hover {
    color: var(--header-color);
  }
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
