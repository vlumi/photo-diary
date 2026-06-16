import React from "react";
import styled from "@emotion/styled";
import { useTranslation } from "react-i18next";
import { Link as RouterLink } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import Builder from "../Gallery/Filters/Builder";
import galleryPhotosService from "../../services/gallery-photos";
import filter, { type Filters as FiltersT } from "../../lib/filter";
import format from "../../lib/format";
import { buildUniqueValues } from "../../lib/uniqueValues";
import { useGalleryCalendar } from "../../lib/useFilteredCalendar";
import { useLangStore } from "../../stores";
import {
  type DateRange,
  type NumericRange,
  type NumericRanges,
} from "../../stores/filters";
import { Section, SectionTitle, SectionHint as Hint } from "./Section";

const ParentLine = styled.div`
  font-size: 0.9em;
  color: var(--primary-color);
  a {
    color: inherit;
  }
`;
const SummaryGrid = styled.dl`
  display: grid;
  grid-template-columns: max-content 1fr;
  column-gap: 12px;
  row-gap: 4px;
  margin: 0;
  font-size: 0.9em;
`;
const SummaryKey = styled.dt`
  color: var(--inactive-color);
  text-transform: uppercase;
  font-size: 0.75em;
  letter-spacing: 0.05em;
  align-self: center;
`;
const SummaryVal = styled.dd`
  margin: 0;
  color: var(--primary-color);
`;

interface Props {
  galleryId: string;
  sourceGalleryId: string;
  // View vs edit. View renders a read-only "label → value" grid;
  // edit mounts the Builder. Save / cancel are owned by the
  // parent `<GalleryEdit>` so one button covers gallery fields +
  // filter together.
  editing: boolean;
  filters: FiltersT;
  setFilters?: (filters: FiltersT) => void;
  dateRange: DateRange | undefined;
  setDateRange?: (dateRange: DateRange | undefined) => void;
  numericRanges: NumericRanges;
  setNumericRange?: (
    category: string,
    range: NumericRange | undefined
  ) => void;
}

const VirtualGalleryFilterSection = ({
  galleryId,
  sourceGalleryId,
  editing,
  filters,
  setFilters,
  dateRange,
  setDateRange,
  numericRanges,
  setNumericRange,
}: Props): React.ReactElement => {
  const { t } = useTranslation();
  const lang = useLangStore((s) => s.lang);
  const countryData = useLangStore((s) => s.countryData);
  void galleryId;

  const filterValuesQuery = useQuery({
    queryKey: ["virtual-gallery-filter-universe", sourceGalleryId, lang],
    queryFn: () =>
      galleryPhotosService.getFilterValues(sourceGalleryId, { lang }),
    enabled: editing,
  });
  // Seed for the date-range card — anchors the native picker to
  // the source gallery's timespan instead of today.
  const sourceCalendar = useGalleryCalendar(sourceGalleryId);
  const defaultDateRange = React.useMemo(() => {
    const fmt = (
      ymd: [number, number, number] | [undefined, undefined, undefined]
    ): string | undefined => {
      const [y, m, d] = ymd;
      if (y === undefined || m === undefined || d === undefined)
        return undefined;
      return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    };
    const from = fmt(sourceCalendar.firstDay());
    const to = fmt(sourceCalendar.lastDay());
    if (!from && !to) return undefined;
    return { from, to };
  }, [sourceCalendar]);
  const uniqueValues = React.useMemo(() => {
    if (!filterValuesQuery.data || !countryData) return undefined;
    return buildUniqueValues(filterValuesQuery.data, lang, t, countryData);
  }, [filterValuesQuery.data, lang, t, countryData]);

  // Read-only summary lines from the current state. Always reads
  // from `filters` / `dateRange` / `numericRanges` props so the
  // parent owns the source of truth.
  const summaryRows: Array<{ key: string; label: string; value: string }> = [];
  const countryDataForFormatter = countryData ?? {
    getName: (_code: string, _lang: string) => undefined,
  };
  const formatCategoryValue = format.categoryValue(
    lang,
    t,
    countryDataForFormatter
  );
  for (const topic of filter.topics()) {
    const topicFilters = filters[topic];
    if (!topicFilters) continue;
    for (const category of filter.categories(topic)) {
      const valueRecord = topicFilters[category];
      if (!valueRecord) continue;
      const keys = Object.keys(valueRecord);
      if (keys.length === 0) continue;
      const formatter = formatCategoryValue(category);
      const values = keys.map((k) => String(formatter(k))).join(", ");
      summaryRows.push({
        key: `f:${topic}:${category}`,
        label: String(t(`stats-category-${category}`)),
        value: values,
      });
    }
  }
  if (dateRange && (dateRange.from || dateRange.to)) {
    const { from, to } = dateRange;
    let val: string;
    if (from && to) val = `${from} – ${to}`;
    else if (from) val = `≥ ${from}`;
    else val = `≤ ${to}`;
    summaryRows.push({
      key: "dr",
      label: String(t("stats-category-date-range")),
      value: val,
    });
  }
  for (const [cat, range] of Object.entries(numericRanges)) {
    if (!range) continue;
    if (range.min === undefined && range.max === undefined) continue;
    const formatter = formatCategoryValue(cat);
    let val: string;
    if (range.min !== undefined && range.max !== undefined) {
      val = `${formatter(range.min)} – ${formatter(range.max)}`;
    } else if (range.min !== undefined) {
      val = `≥ ${formatter(range.min)}`;
    } else {
      val = `≤ ${formatter(range.max as number)}`;
    }
    summaryRows.push({
      key: `nr:${cat}`,
      label: String(t(`stats-category-${cat}`)),
      value: val,
    });
  }

  return (
    <Section>
      <SectionTitle>{t("manage-virtual-gallery-filter-title")}</SectionTitle>
      <ParentLine>
        {t("manage-virtual-gallery-source")}{" "}
        <RouterLink to={`/g/${sourceGalleryId}`}>{sourceGalleryId}</RouterLink>
      </ParentLine>
      {editing ? (
        <>
          <Hint>{t("manage-virtual-gallery-filter-hint")}</Hint>
          {uniqueValues && countryData && setFilters && setDateRange ? (
            <Builder
              uniqueValues={uniqueValues}
              lang={lang}
              countryData={countryData}
              hideMap={false}
              filters={filters}
              setFilters={setFilters}
              dateRange={dateRange}
              setDateRange={setDateRange}
              numericRanges={numericRanges}
              setNumericRange={setNumericRange}
              defaultDateRange={defaultDateRange}
            />
          ) : (
            <Hint>{t("loading")}</Hint>
          )}
        </>
      ) : summaryRows.length === 0 ? (
        <Hint>{t("manage-virtual-gallery-no-filter")}</Hint>
      ) : (
        <SummaryGrid>
          {summaryRows.map((row) => (
            <React.Fragment key={row.key}>
              <SummaryKey>{row.label}</SummaryKey>
              <SummaryVal>{row.value}</SummaryVal>
            </React.Fragment>
          ))}
        </SummaryGrid>
      )}
    </Section>
  );
};

export default VirtualGalleryFilterSection;
