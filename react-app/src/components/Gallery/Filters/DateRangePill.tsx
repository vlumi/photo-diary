import React from "react";
import styled from "@emotion/styled";
import { useTranslation } from "react-i18next";
import { BsFillXCircleFill, BsFillPlusCircleFill } from "react-icons/bs";

import {
  isEmptyDateRange,
  useFiltersStore,
  type DateRange,
} from "../../../stores/filters";

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
const AddIcon = styled(BsFillPlusCircleFill)`
  cursor: pointer;
  margin: 0 5px;
  color: var(--header-color);
  &:hover {
    color: var(--inactive-color);
  }
`;

// Date-range filter UI sibling to the topic/category/key filter
// pills. Lives in the store as `useFiltersStore.dateRange` and
// flows into every per-view / stats query body as a top-level
// `dateRange` field (#264). Both bounds independent — operator
// can leave either side open for "since X" / "until Y" half-open
// ranges. Native `<input type="date">` for now; a fancier picker
// can come later.
const DateRangePill = (): React.ReactElement => {
  const { t } = useTranslation();
  const dateRange = useFiltersStore((s) => s.dateRange);
  const setDateRange = useFiltersStore((s) => s.setDateRange);
  const [shown, setShown] = React.useState<boolean>(!isEmptyDateRange(dateRange));

  React.useEffect(() => {
    // External setters (e.g. saved-filter activation) can drop a
    // range in; surface the pill if a range becomes active.
    if (!isEmptyDateRange(dateRange) && !shown) setShown(true);
  }, [dateRange, shown]);

  if (!shown) {
    return (
      <AddIcon
        onClick={() => setShown(true)}
        aria-label={t("filters-date-range-add")}
        title={t("filters-date-range-add")}
      />
    );
  }

  const set = (next: DateRange) => setDateRange(next);
  const handleClear = () => {
    setDateRange({});
    setShown(false);
  };
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
        onClick={handleClear}
        aria-label={t("filters-date-range-clear")}
        title={t("filters-date-range-clear")}
      />
    </Pill>
  );
};
export default DateRangePill;
