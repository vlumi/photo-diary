import React from "react";
import styled from "@emotion/styled";
import { useTranslation } from "react-i18next";
import { BsFillFunnelFill, BsXLg } from "react-icons/bs";

import filter, { type Filters as FiltersT } from "../../../lib/filter";
import format from "../../../lib/format";
import stats, { type UniqueValues } from "../../../lib/stats";
import { useFiltersStore, useFilterModalStore } from "../../../stores";
import {
  type DateRange,
  type NumericRange,
} from "../../../stores/filters";
import renderFilterValue from "./renderFilterValue";

interface CountryData {
  getName(code: string, lang: string): string | undefined;
  isValid(code: string): boolean;
}

const Root = styled.div`
  color: inherit;
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 4px 6px;
  padding: 2px 8px;
  margin: 0 5px;
  cursor: pointer;
  font-size: 0.95em;
  min-width: 0;
  max-width: 100%;
  overflow-wrap: anywhere;
`;
const Funnel = styled.span`
  display: inline-flex;
  align-items: center;
  opacity: 0.55;
  margin-right: 2px;
  font-size: 0.85em;
`;
const Chunk = styled.span`
  display: inline-flex;
  align-items: baseline;
  gap: 4px;
  min-width: 0;
  max-width: 100%;
`;
const CatLabel = styled.span`
  opacity: 0.6;
  font-style: italic;
  flex-shrink: 0;
`;
const ValueGroup = styled.span`
  display: inline-flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 2px 4px;
  min-width: 0;
  max-width: 100%;
`;
const ValueChunk = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-weight: 500;
  min-width: 0;
  max-width: 100%;
  overflow-wrap: anywhere;
  word-break: break-word;
  & .remove {
    visibility: hidden;
    cursor: pointer;
    opacity: 0.55;
    font-size: 0.85em;
  }
  &:hover .remove {
    visibility: visible;
  }
  &:hover .remove:hover {
    opacity: 1;
  }
`;
const Separator = styled.span`
  opacity: 0.45;
`;
const AddHint = styled.span`
  margin-left: 6px;
  opacity: 0.55;
  font-style: italic;
  &:hover {
    opacity: 0.9;
  }
`;
const ClearLink = styled.span`
  margin-left: 6px;
  opacity: 0.55;
  font-style: italic;
  &:hover {
    opacity: 0.9;
  }
`;

interface Props {
  uniqueValues: UniqueValues;
  lang: string;
  countryData: CountryData;
}

const dateRangeLabel = (range: DateRange, t: ReturnType<typeof useTranslation>["t"]): string => {
  const parts: string[] = [];
  if (range.from) parts.push(`${t("filters-date-range-from")} ${range.from}`);
  if (range.to) parts.push(`${t("filters-date-range-to")} ${range.to}`);
  if (parts.length === 0) return String(t("filters-date-range-empty"));
  return parts.join(" ");
};

const numericRangeLabel = (
  range: NumericRange,
  category: string,
  formatValue: (value: number) => string,
  t: ReturnType<typeof useTranslation>["t"]
): string => {
  void category;
  const { min, max } = range;
  if (min === undefined && max === undefined) {
    return String(t("filters-numeric-range-empty"));
  }
  if (min !== undefined && max !== undefined) {
    return `${formatValue(min)}–${formatValue(max)}`;
  }
  if (min !== undefined) return `≥ ${formatValue(min)}`;
  return `≤ ${formatValue(max as number)}`;
};

const lookupValueLabel = (
  uniqueValues: UniqueValues,
  topic: string,
  category: string,
  rawKey: string
): string => {
  const entries = uniqueValues[topic]?.[category];
  if (!entries) return rawKey;
  const match = entries.find((e) => String(e.key) === rawKey);
  return match?.value ?? rawKey;
};

const FilterStrip = ({
  uniqueValues,
  lang,
  countryData,
}: Props): React.ReactElement => {
  const { t } = useTranslation();
  const filters = useFiltersStore((s) => s.filters);
  const dateRange = useFiltersStore((s) => s.dateRange);
  const numericRanges = useFiltersStore((s) => s.numericRanges);
  const setFilters = useFiltersStore((s) => s.setFilters);
  const setDateRange = useFiltersStore((s) => s.setDateRange);
  const setNumericRange = useFiltersStore((s) => s.setNumericRange);
  const setNumericRanges = useFiltersStore((s) => s.setNumericRanges);
  const openModal = useFilterModalStore((s) => s.open);

  type ActiveChunk =
    | {
        kind: "values";
        topic: string;
        category: string;
        values: string[];
      }
    | { kind: "date-range" }
    | { kind: "numeric-range"; category: string; range: NumericRange };

  const chunks: ActiveChunk[] = [];
  for (const topic of filter.topics()) {
    const topicFilters = (filters as FiltersT)[topic];
    for (const category of filter.categories(topic)) {
      if (topicFilters && topicFilters[category]) {
        const valueRecord = topicFilters[category];
        const values = Object.keys(valueRecord);
        if (values.length > 0) {
          chunks.push({ kind: "values", topic, category, values });
        }
      }
      const numericRange = numericRanges[category];
      if (numericRange) {
        chunks.push({ kind: "numeric-range", category, range: numericRange });
      }
    }
    if (topic === "time" && dateRange !== undefined) {
      chunks.push({ kind: "date-range" });
    }
  }

  const stop = (e: React.MouseEvent) => e.stopPropagation();

  const handleRemoveValue = (
    e: React.MouseEvent,
    topic: string,
    category: string,
    rawKey: string
  ) => {
    e.stopPropagation();
    const next = filter.applyNewFilter(
      filters,
      topic,
      category,
      rawKey,
      stats.UNKNOWN
    );
    setFilters(next);
  };

  const handleClearDateRange = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDateRange(undefined);
  };

  const handleClearAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    setFilters({});
    setDateRange(undefined);
    setNumericRanges({});
  };
  const handleClearNumericRange = (e: React.MouseEvent, category: string) => {
    e.stopPropagation();
    setNumericRange(category, undefined);
  };

  return (
    <Root onClick={openModal} role="button" aria-label={String(t("filters-open"))}>
      <Funnel>
        <BsFillFunnelFill />
      </Funnel>
      {chunks.map((chunk, idx) => {
        const isLast = idx === chunks.length - 1;
        if (chunk.kind === "date-range") {
          return (
            <Chunk key={`chunk:date-range`}>
              <CatLabel>{t("stats-category-date-range")}:</CatLabel>
              <ValueChunk>
                <span>{dateRangeLabel(dateRange as DateRange, t)}</span>
                <span
                  className="remove"
                  onClick={handleClearDateRange}
                  aria-label={String(t("filters-date-range-clear"))}
                  title={String(t("filters-date-range-clear"))}
                >
                  <BsXLg />
                </span>
              </ValueChunk>
              {!isLast ? <Separator>,</Separator> : null}
            </Chunk>
          );
        }
        if (chunk.kind === "numeric-range") {
          const formatValue = (v: number): string =>
            String(
              format
                .categoryValue(lang, t, countryData)(chunk.category)(v)
            );
          return (
            <Chunk key={`chunk:numeric-range:${chunk.category}`}>
              <CatLabel>{t(`stats-category-${chunk.category}`)}:</CatLabel>
              <ValueChunk onClick={stop}>
                <span>
                  {numericRangeLabel(chunk.range, chunk.category, formatValue, t)}
                </span>
                <span
                  className="remove"
                  onClick={(e) => handleClearNumericRange(e, chunk.category)}
                  aria-label={String(t("filters-numeric-range-clear"))}
                  title={String(t("filters-numeric-range-clear"))}
                >
                  <BsXLg />
                </span>
              </ValueChunk>
              {!isLast ? <Separator>,</Separator> : null}
            </Chunk>
          );
        }
        const { topic, category, values } = chunk;
        return (
          <Chunk key={`chunk:${topic}:${category}`}>
            <CatLabel>{t(`stats-category-${category}`)}:</CatLabel>
            <ValueGroup>
              {values.map((rawKey, vIdx) => {
                const label = lookupValueLabel(uniqueValues, topic, category, rawKey);
                return (
                  <React.Fragment key={`v:${topic}:${category}:${rawKey}`}>
                    <ValueChunk onClick={stop}>
                      <span>
                        {renderFilterValue(category, rawKey, label, lang, t, countryData)}
                      </span>
                      <span
                        className="remove"
                        onClick={(e) =>
                          handleRemoveValue(e, topic, category, rawKey)
                        }
                        aria-label={String(t("filters-remove-value"))}
                        title={String(t("filters-remove-value"))}
                      >
                        <BsXLg />
                      </span>
                    </ValueChunk>
                    {vIdx < values.length - 1 ? (
                      <Separator>,</Separator>
                    ) : null}
                  </React.Fragment>
                );
              })}
            </ValueGroup>
            {!isLast ? <Separator>,</Separator> : null}
          </Chunk>
        );
      })}
      <AddHint>
        {chunks.length === 0
          ? `+ ${t("filters-add")}`
          : `+ ${t("filters-add-more")}`}
      </AddHint>
      {chunks.length > 0 ? (
        <ClearLink
          onClick={handleClearAll}
          role="button"
          aria-label={String(t("filters-clear-all"))}
          title={String(t("filters-clear-all"))}
        >
          ╳ {t("filters-clear-all")}
        </ClearLink>
      ) : null}
    </Root>
  );
};

export default FilterStrip;
