import React from "react";
import styled from "@emotion/styled";
import { useTranslation } from "react-i18next";
import { BsXLg } from "react-icons/bs";

import filter, { type Filters as FiltersT } from "../../../lib/filter";
import format from "../../../lib/format";
import stats, {
  type UniqueValues,
  type UniqueValueEntry,
} from "../../../lib/stats";
import { useFiltersStore, useBetaStore } from "../../../stores";
import {
  type DateRange,
  type NumericRange,
} from "../../../stores/filters";
import type { BetaFeature } from "../../../stores/beta";
import renderFilterValue from "./renderFilterValue";

interface CountryData {
  getName(code: string, lang: string): string | undefined;
  isValid(code: string): boolean;
}

const TOP_N = 12;
const LOCATION_CATEGORIES = new Set(["country", "state", "city", "geotagged"]);
// Continuous-variable categories that render a min/max range card
// instead of value chips (#264). Photo-derived numbers benefit
// from "between X and Y" more than "exactly any-of".
const NUMERIC_RANGE_CATEGORIES = new Set([
  "focal-length",
  "focal-length-eq",
  "aperture",
  "exposure-time",
  "iso",
  "ev",
  "lv",
]);
const BETA_CATEGORIES: Record<string, BetaFeature> = {
  state: "regions",
  "focal-length-eq": "focalLengthEquiv",
};

const Root = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;
const TopicSection = styled.section`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;
const TopicLabel = styled.h3`
  margin: 0;
  font-size: 1em;
  font-weight: 600;
  opacity: 0.85;
  border-bottom: 1px solid var(--inactive-color);
  padding-bottom: 4px;
`;
const CardGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 10px;
`;
const Card = styled.div`
  border: 1px solid var(--inactive-color);
  border-radius: 6px;
  padding: 8px 10px;
  background: var(--primary-background);
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-height: 60px;
  min-width: 0;
`;
const CardHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
`;
const CardTitle = styled.div`
  font-weight: 600;
  font-size: 0.95em;
`;
const SearchInput = styled.input`
  font: inherit;
  font-size: 0.9em;
  padding: 2px 6px;
  background: var(--primary-background);
  color: var(--primary-color);
  border: 1px solid var(--inactive-color);
  border-radius: 4px;
  width: 100%;
  box-sizing: border-box;
`;
const Chips = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  max-height: 220px;
  overflow-y: auto;
`;
const Chip = styled.button<{
  active?: boolean;
  dim?: boolean;
  anchor?: boolean;
}>`
  display: inline-block;
  font: inherit;
  font-size: 0.9em;
  padding: 2px 8px;
  border-radius: 12px;
  cursor: pointer;
  border: 1px solid var(--inactive-color);
  font-weight: ${({ anchor }) => (anchor ? 700 : 400)};
  background: ${({ active, anchor }) =>
    anchor
      ? "var(--primary-color)"
      : active
        ? "var(--header-background)"
        : "var(--primary-background)"};
  color: ${({ active, anchor }) =>
    anchor
      ? "var(--primary-background)"
      : active
        ? "var(--header-color)"
        : "var(--primary-color)"};
  box-shadow: ${({ anchor }) =>
    anchor ? "0 0 0 2px var(--primary-color)" : "none"};
  opacity: ${({ dim }) => (dim ? 0.45 : 1)};
  max-width: 100%;
  text-align: left;
  white-space: normal;
  line-height: 1.3;
  overflow-wrap: anywhere;
  word-break: break-word;
  vertical-align: top;
  position: relative;
  z-index: ${({ anchor }) => (anchor ? 1 : 0)};
  &:hover {
    border-color: var(--primary-color);
    opacity: 1;
  }
`;
const Footer = styled.div`
  font-size: 0.8em;
  opacity: 0.65;
  font-style: italic;
`;
const DateInputs = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
`;
const DateInput = styled.input`
  font: inherit;
  font-size: 0.9em;
  padding: 2px 6px;
  background: var(--primary-background);
  color: var(--primary-color);
  border: 1px solid var(--inactive-color);
  border-radius: 4px;
`;
const RangeChips = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 3px;
  max-height: 140px;
  overflow-y: auto;
  min-width: 0;
`;
const RangeStatus = styled.div`
  font-size: 0.85em;
  font-weight: 500;
  padding: 4px 0 0;
  color: var(--primary-color);
`;
const InlineLabel = styled.span`
  font-size: 0.85em;
  opacity: 0.7;
`;
const TextButton = styled.button`
  font: inherit;
  font-size: 0.85em;
  padding: 2px 8px;
  border-radius: 6px;
  background: var(--header-background);
  color: var(--header-color);
  border: 1px solid var(--inactive-color);
  cursor: pointer;
  &:hover {
    border-color: var(--primary-color);
  }
`;
const ClearButton = styled.button`
  font: inherit;
  background: none;
  border: none;
  color: var(--inactive-color);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  padding: 2px;
  &:hover {
    color: var(--primary-color);
  }
`;
const FooterButton = styled.button`
  font: inherit;
  font-size: 0.8em;
  font-style: italic;
  opacity: 0.65;
  background: none;
  border: none;
  text-align: left;
  padding: 2px 0;
  cursor: pointer;
  color: inherit;
  &:hover {
    opacity: 1;
    text-decoration: underline;
  }
`;
const SubBackdrop = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.35);
  z-index: 2100;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 20px;
  overflow: auto;
`;
const SubFrame = styled.div`
  background: var(--primary-background);
  color: var(--primary-color);
  border: 1px solid var(--inactive-color);
  border-radius: 8px;
  padding: 14px 16px;
  width: 100%;
  max-width: min(640px, calc(100vw - 40px));
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
  margin: auto 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
  overflow-x: hidden;
`;
const SubChips = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  max-height: 60vh;
  overflow-y: auto;
`;

interface Props {
  uniqueValues: UniqueValues;
  lang: string;
  countryData: CountryData;
  hideMap: boolean;
}

const buildEntriesByCategory = (
  uniqueValues: UniqueValues
): Record<string, UniqueValueEntry[]> => {
  const out: Record<string, UniqueValueEntry[]> = {};
  for (const cats of Object.values(uniqueValues)) {
    for (const [cat, entries] of Object.entries(cats)) {
      out[cat] = entries;
    }
  }
  return out;
};

const Builder = ({
  uniqueValues,
  lang,
  countryData,
  hideMap,
}: Props): React.ReactElement => {
  const { t } = useTranslation();
  const filters = useFiltersStore((s) => s.filters);
  const setFilters = useFiltersStore((s) => s.setFilters);
  const dateRange = useFiltersStore((s) => s.dateRange);
  const setDateRange = useFiltersStore((s) => s.setDateRange);
  const numericRanges = useFiltersStore((s) => s.numericRanges);
  const setNumericRange = useFiltersStore((s) => s.setNumericRange);
  const enabled = useBetaStore((s) => s.enabled);
  const isBetaAllowed = (category: string): boolean => {
    const required = BETA_CATEGORIES[category];
    return !required || enabled[required];
  };

  const [search, setSearch] = React.useState<Record<string, string>>({});
  // `${topic}:${category}` of the card whose full-list sub-modal is
  // open; null when no sub-modal is showing. Drives the "browse all
  // values" overlay so the operator can scan the universe in natural
  // sort order rather than search-as-you-type.
  const [subModalKey, setSubModalKey] = React.useState<string | null>(null);
  const [subModalSearch, setSubModalSearch] = React.useState("");

  React.useEffect(() => {
    if (!subModalKey) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        setSubModalKey(null);
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [subModalKey]);

  const entriesByCategory = React.useMemo(
    () => buildEntriesByCategory(uniqueValues),
    [uniqueValues]
  );

  const isValueActive = (
    topic: string,
    category: string,
    rawKey: string
  ): boolean => {
    const topicFilters = (filters as FiltersT)[topic];
    if (!topicFilters) return false;
    const categoryFilters = topicFilters[category];
    if (!categoryFilters) return false;
    return rawKey in categoryFilters;
  };

  const toggleValue = (topic: string, category: string, rawKey: string) => {
    const next = filter.applyNewFilter(
      filters,
      topic,
      category,
      rawKey,
      stats.UNKNOWN
    );
    setFilters(next);
  };

  const sortByCountThenLabel = (a: UniqueValueEntry, b: UniqueValueEntry): number => {
    const ca = a.count ?? 0;
    const cb = b.count ?? 0;
    if (ca !== cb) return cb - ca;
    return String(a.value).localeCompare(String(b.value));
  };

  // Numeric range card (#264): one row of clickable chips per
  // category, labelled with the category's own formatter
  // (`f/2.8`, `1/200`, `ISO 800`). Click semantics:
  //   - no range yet → anchor (min === max === clicked value)
  //   - anchor only → extend to a range bracketing the anchor and
  //     the clicked value
  //   - full range → adjust whichever endpoint is closer to the
  //     clicked value (works as both "extend outward" and
  //     "shrink inward"; equally natural on PC and touch with no
  //     shift / modifier required)
  // Chips in `[min, max]` render as active so the range reads as
  // a contiguous fill. × clears.
  const formatCategoryValue = format.categoryValue(lang, t, countryData);
  const renderNumericRangeCard = (topic: string, category: string) => {
    const range: NumericRange | undefined = numericRanges[category];
    const entries = entriesByCategory[category] ?? [];
    const numericValues = Array.from(
      new Set(
        entries
          .map((e) => Number(e.key))
          .filter((n) => !Number.isNaN(n))
      )
    ).sort((a, b) => a - b);
    const valueFormatter = formatCategoryValue(category);
    const fmt = (n: number): string => String(valueFormatter(n));
    const isInRange = (v: number): boolean => {
      if (!range) return false;
      if (range.min !== undefined && v < range.min) return false;
      if (range.max !== undefined && v > range.max) return false;
      return range.min !== undefined || range.max !== undefined;
    };
    // Anchor of the current range (the fixed endpoint). Defaults
    // to "min" so a fresh anchor reads as the lower bound.
    const anchorSide: "min" | "max" = range?.anchor ?? "min";
    const anchorValue =
      anchorSide === "min" ? range?.min : range?.max;
    const handleChipClick = (value: number) => {
      // No range → anchor here.
      if (
        !range ||
        (range.min === undefined && range.max === undefined)
      ) {
        setNumericRange(category, {
          min: value,
          max: value,
          anchor: "min",
        });
        return;
      }
      const min = range.min;
      const max = range.max;
      const singleAnchor =
        min !== undefined && max !== undefined && min === max;
      // Tap on the single-anchor chip clears the filter.
      if (singleAnchor && value === min) {
        setNumericRange(category, undefined);
        return;
      }
      // From single-anchor, any other chip extends to a full range
      // bracketing the two; anchor stays where it was.
      if (singleAnchor && min !== undefined) {
        setNumericRange(category, {
          min: Math.min(min, value),
          max: Math.max(min, value),
          anchor: min === Math.min(min, value) ? "min" : "max",
        });
        return;
      }
      // Full range: tapping the min endpoint chip designates the
      // min as anchor; tapping the max endpoint designates max as
      // anchor. The range itself stays the same.
      if (value === min) {
        setNumericRange(category, { ...range, anchor: "min" });
        return;
      }
      if (value === max) {
        setNumericRange(category, { ...range, anchor: "max" });
        return;
      }
      // Any other chip moves the free end (the non-anchored
      // endpoint) to the clicked value. The anchor's value stays
      // where it was — if the click crosses past the anchor in
      // value space, the anchor's side flips to keep the range
      // well-ordered but its value remains the same chip.
      const fixed = anchorValue;
      if (fixed === undefined) {
        setNumericRange(category, {
          min: value,
          max: value,
          anchor: "min",
        });
        return;
      }
      const lo = Math.min(fixed, value);
      const hi = Math.max(fixed, value);
      setNumericRange(category, {
        min: lo,
        max: hi,
        anchor: fixed === lo ? "min" : "max",
      });
    };
    return (
      <Card key={`card:${topic}:${category}`}>
        <CardHeader>
          <CardTitle>{t(`stats-category-${category}`)}</CardTitle>
          {range !== undefined ? (
            <ClearButton
              type="button"
              onClick={() => setNumericRange(category, undefined)}
              aria-label={String(t("filters-numeric-range-clear"))}
              title={String(t("filters-numeric-range-clear"))}
            >
              <BsXLg />
            </ClearButton>
          ) : null}
        </CardHeader>
        <RangeChips>
          {numericValues.length === 0 ? (
            <Footer>{t("filters-no-values")}</Footer>
          ) : (
            numericValues.map((v) => {
              const inRange = isInRange(v);
              const isAnchor =
                range !== undefined && anchorValue !== undefined && v === anchorValue;
              const singleAnchor =
                range !== undefined &&
                range.min !== undefined &&
                range.max !== undefined &&
                range.min === range.max;
              const title = isAnchor
                ? singleAnchor
                  ? String(t("filters-numeric-range-tip-clear"))
                  : String(t("filters-numeric-range-tip-swap"))
                : undefined;
              return (
                <Chip
                  key={`range-chip:${category}:${v}`}
                  type="button"
                  active={inRange}
                  dim={range !== undefined && !inRange}
                  anchor={isAnchor}
                  title={title}
                  onClick={() => handleChipClick(v)}
                >
                  {fmt(v)}
                </Chip>
              );
            })
          )}
        </RangeChips>
        {range !== undefined &&
        (range.min !== undefined || range.max !== undefined) ? (
          <RangeStatus>
            {range.min !== undefined &&
            range.max !== undefined &&
            range.min === range.max
              ? fmt(range.min)
              : `${
                  range.min !== undefined ? fmt(range.min) : "…"
                } – ${
                  range.max !== undefined ? fmt(range.max) : "…"
                }`}
          </RangeStatus>
        ) : null}
      </Card>
    );
  };

  const renderDateRangeCard = () => {
    const range: DateRange | undefined = dateRange;
    return (
      <Card key="card:time:date-range">
        <CardHeader>
          <CardTitle>{t("stats-category-date-range")}</CardTitle>
          {range !== undefined ? (
            <ClearButton
              type="button"
              onClick={() => setDateRange(undefined)}
              aria-label={String(t("filters-date-range-clear"))}
              title={String(t("filters-date-range-clear"))}
            >
              <BsXLg />
            </ClearButton>
          ) : null}
        </CardHeader>
        {range === undefined ? (
          <TextButton type="button" onClick={() => setDateRange({})}>
            + {t("filters-add")}
          </TextButton>
        ) : (
          <DateInputs>
            <InlineLabel>{t("filters-date-range-from")}</InlineLabel>
            <DateInput
              type="date"
              value={range.from ?? ""}
              onChange={(e) =>
                setDateRange({ ...range, from: e.target.value || undefined })
              }
            />
            <InlineLabel>{t("filters-date-range-to")}</InlineLabel>
            <DateInput
              type="date"
              value={range.to ?? ""}
              onChange={(e) =>
                setDateRange({ ...range, to: e.target.value || undefined })
              }
            />
          </DateInputs>
        )}
      </Card>
    );
  };

  const renderValueCard = (topic: string, category: string) => {
    const cardKey = `${topic}:${category}`;
    const term = (search[cardKey] ?? "").trim().toLowerCase();
    const allEntries = entriesByCategory[category] ?? [];
    const filtered = term
      ? allEntries.filter(
          (e) =>
            String(e.value).toLowerCase().includes(term) ||
            String(e.key).toLowerCase().includes(term)
        )
      : allEntries;
    const active: UniqueValueEntry[] = [];
    const inactive: UniqueValueEntry[] = [];
    for (const entry of filtered) {
      if (isValueActive(topic, category, String(entry.key))) {
        active.push(entry);
      } else {
        inactive.push(entry);
      }
    }
    inactive.sort(sortByCountThenLabel);
    // 0-count chips collapse under the current filter — "Show all"
    // sub-modal reveals them. Exception: when this category is
    // itself filtered, show them anyway so the operator can pile on
    // more values (multi-select expansion). 0-count chips render
    // dimmed to mark them as "no hits under the current filter,
    // but still selectable".
    const showZeroCounts = active.length > 0 || !!term;
    const inactiveTopList = showZeroCounts
      ? inactive
      : inactive.filter((e) => (e.count ?? 0) > 0);
    const visibleInactive = term ? inactive : inactiveTopList.slice(0, TOP_N);
    const chips = [...active, ...visibleInactive];
    // Anything in the universe past what's rendered → offer the
    // sub-modal. Includes the case where 0-count entries were
    // filtered out of the top list, so the operator can browse to
    // them and combine filters that don't currently match (multi-
    // category drill-out, not strict drill-down).
    const moreAvailable = !term && allEntries.length > chips.length;

    return (
      <Card key={`card:${topic}:${category}`}>
        <CardHeader>
          <CardTitle>{t(`stats-category-${category}`)}</CardTitle>
        </CardHeader>
        {allEntries.length > TOP_N || active.length > 0 ? (
          <SearchInput
            type="search"
            placeholder={String(t("filters-search-placeholder"))}
            value={search[cardKey] ?? ""}
            onChange={(e) =>
              setSearch({ ...search, [cardKey]: e.target.value })
            }
          />
        ) : null}
        <Chips>
          {chips.length === 0 ? (
            <Footer>{t("filters-no-values")}</Footer>
          ) : (
            chips.map((entry) => {
              const rawKey = String(entry.key);
              const active = isValueActive(topic, category, rawKey);
              const dim = !active && (entry.count ?? 0) === 0;
              return (
                <Chip
                  key={`chip:${topic}:${category}:${rawKey}`}
                  type="button"
                  active={active}
                  dim={dim}
                  onClick={() => toggleValue(topic, category, rawKey)}
                >
                  {renderFilterValue(
                    category,
                    rawKey,
                    String(entry.value),
                    lang,
                    t,
                    countryData
                  )}
                </Chip>
              );
            })
          )}
        </Chips>
        {moreAvailable ? (
          <FooterButton
            type="button"
            onClick={() => {
              setSubModalKey(cardKey);
              setSubModalSearch("");
            }}
          >
            {t("filters-show-all", { count: allEntries.length })}
          </FooterButton>
        ) : null}
      </Card>
    );
  };

  // Sub-modal: all values for one category in natural order. Same
  // toggle semantics as the card chips — clicks live-update the
  // filter and the sub-modal stays open until the operator dismisses
  // it. `entries` is already in natural sort from buildUniqueValues,
  // so no extra sort here.
  const renderSubModal = () => {
    if (!subModalKey) return null;
    const [topic, category] = subModalKey.split(":");
    if (!topic || !category) return null;
    const entries = entriesByCategory[category] ?? [];
    const term = subModalSearch.trim().toLowerCase();
    const filtered = term
      ? entries.filter(
          (e) =>
            String(e.value).toLowerCase().includes(term) ||
            String(e.key).toLowerCase().includes(term)
        )
      : entries;
    const close = () => setSubModalKey(null);
    const onBackdrop = (event: React.MouseEvent) => {
      if (event.target === event.currentTarget) close();
    };
    return (
      <SubBackdrop onClick={onBackdrop} role="dialog" aria-modal="true">
        <SubFrame>
          <CardHeader>
            <CardTitle>{t(`stats-category-${category}`)}</CardTitle>
            <ClearButton
              type="button"
              onClick={close}
              aria-label={String(t("close"))}
            >
              ╳
            </ClearButton>
          </CardHeader>
          <SearchInput
            type="search"
            autoFocus
            placeholder={String(t("filters-search-placeholder"))}
            value={subModalSearch}
            onChange={(e) => setSubModalSearch(e.target.value)}
          />
          <SubChips>
            {filtered.length === 0 ? (
              <Footer>{t("filters-no-values")}</Footer>
            ) : (
              filtered.map((entry) => {
                const rawKey = String(entry.key);
                const isActive = isValueActive(topic, category, rawKey);
                const dim = !isActive && (entry.count ?? 0) === 0;
                return (
                  <Chip
                    key={`sub-chip:${topic}:${category}:${rawKey}`}
                    type="button"
                    active={isActive}
                    dim={dim}
                    onClick={() => toggleValue(topic, category, rawKey)}
                  >
                    {renderFilterValue(
                      category,
                      rawKey,
                      String(entry.value),
                      lang,
                      t,
                      countryData
                    )}
                  </Chip>
                );
              })
            )}
          </SubChips>
        </SubFrame>
      </SubBackdrop>
    );
  };

  return (
    <Root>
      {filter.topics().map((topic) => {
        const categories = filter
          .categories(topic)
          .filter((category) =>
            !(hideMap && LOCATION_CATEGORIES.has(category))
          )
          .filter(isBetaAllowed);
        if (categories.length === 0) return null;
        return (
          <TopicSection key={`topic:${topic}`}>
            <TopicLabel>{t(`stats-topic-${topic}`)}</TopicLabel>
            <CardGrid>
              {categories.map((category) => {
                if (category === "date-range") return renderDateRangeCard();
                if (NUMERIC_RANGE_CATEGORIES.has(category)) {
                  return renderNumericRangeCard(topic, category);
                }
                return renderValueCard(topic, category);
              })}
            </CardGrid>
          </TopicSection>
        );
      })}
      {renderSubModal()}
    </Root>
  );
};

export default Builder;
