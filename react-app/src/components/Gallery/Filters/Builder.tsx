import React from "react";
import styled from "@emotion/styled";
import { useTranslation } from "react-i18next";
import { BsXLg } from "react-icons/bs";

import filter, { type Filters as FiltersT } from "../../../lib/filter";
import stats, {
  type UniqueValues,
  type UniqueValueEntry,
} from "../../../lib/stats";
import { useFiltersStore, useBetaStore } from "../../../stores";
import { type DateRange } from "../../../stores/filters";
import type { BetaFeature } from "../../../stores/beta";
import renderFilterValue from "./renderFilterValue";

interface CountryData {
  getName(code: string, lang: string): string | undefined;
  isValid(code: string): boolean;
}

const TOP_N = 12;
const LOCATION_CATEGORIES = new Set(["country", "state", "city", "geotagged"]);
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
const Chip = styled.button<{ active?: boolean; dim?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font: inherit;
  font-size: 0.9em;
  padding: 2px 8px;
  border-radius: 12px;
  cursor: pointer;
  border: 1px solid var(--inactive-color);
  background: ${({ active }) =>
    active ? "var(--header-background)" : "var(--primary-background)"};
  color: ${({ active }) =>
    active ? "var(--header-color)" : "var(--primary-color)"};
  opacity: ${({ dim }) => (dim ? 0.45 : 1)};
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
  max-width: 640px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
  margin: auto 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
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
              {categories.map((category) =>
                category === "date-range"
                  ? renderDateRangeCard()
                  : renderValueCard(topic, category)
              )}
            </CardGrid>
          </TopicSection>
        );
      })}
      {renderSubModal()}
    </Root>
  );
};

export default Builder;
