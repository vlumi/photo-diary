import React from "react";
import { useParams } from "react-router-dom";
import styled from "@emotion/styled";
import { useTranslation } from "react-i18next";
import {
  BsFillFunnelFill,
  BsFillXCircleFill,
  BsFillPlusCircleFill,
} from "react-icons/bs";

import Topic from "./Topic";

import filter, { type Filters as FiltersT } from "../../../lib/filter";
import type { UniqueValues } from "../../../lib/stats";
import { useBetaStore, useFiltersStore } from "../../../stores";
import seedDateRangeFromUrl from "./seedDateRange";

interface CountryData {
  getName(code: string, lang: string): string | undefined;
  isValid(code: string): boolean;
}

const Root = styled.div`
  color: var(--header-color);
  background-color: var(--header-background);
  display: flex;
  flex-wrap: nowrap;
  align-items: stretch;
  justify-content: flex-start;
  padding: 2px 5px;
  margin: 0 5px;
  border-radius: 20px;
`;
const FilterTitle = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-start;
  margin: 0 5px;
  font-style: italic;
`;
const FilterContainer = styled.div`
  flex-grow: 1;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-start;
`;
const NewTopics = styled.select`
  margin: 0 5px;
`;
const NewTopic = styled.option``;
const NewTopicGroup = styled.optgroup``;
const NewCategory = styled.option``;

interface Props {
  filters: FiltersT;
  setFilters: (filters: FiltersT) => void;
  uniqueValues: UniqueValues;
  lang: string;
  countryData: CountryData;
  hideMap: boolean;
}

const LOCATION_CATEGORIES = new Set(["country", "state", "city", "geotagged"]);
// Category → which beta toggle gates it. Filter chip / dropdown only
// renders when the corresponding `enabled[BetaFeature]` is true.
const BETA_CATEGORIES: Record<string, "regions" | "focalLengthEquiv"> = {
  state: "regions",
  "focal-length-eq": "focalLengthEquiv",
};

const Filters = ({
  filters,
  setFilters,
  uniqueValues,
  lang,
  countryData,
  hideMap,
}: Props): React.ReactElement => {
  const [topicSelector, setTopicSelector] = React.useState(false);
  const enabled = useBetaStore((s) => s.enabled);
  const isBetaAllowed = (category: string): boolean => {
    const required = BETA_CATEGORIES[category];
    return !required || enabled[required];
  };

  const { t } = useTranslation();

  const setDateRange = useFiltersStore((s) => s.setDateRange);
  const dateRange = useFiltersStore((s) => s.dateRange);
  const { year, month, day } = useParams<{
    year?: string;
    month?: string;
    day?: string;
  }>();

  const alreadyFilteredCategory = (topic: string, category: string): boolean => {
    // Date range lives in its own store slot, not in the filters
    // matrix — already-active means the pill is rendered.
    if (topic === "time" && category === "date-range") {
      return dateRange !== undefined;
    }
    return topic in filters && category in filters[topic];
  };

  const handleToggleAddTopicClick = () => {
    setTopicSelector(!topicSelector);
  };

  const renderTopicAdder = () => {
    const handleSelect = (event: React.ChangeEvent<HTMLSelectElement>) => {
      const topicElement = (
        event.target.querySelector("option:checked") as HTMLElement | null
      )?.closest("[data-type=topic]");
      if (!topicElement) {
        return;
      }
      const topic = topicElement.getAttribute("data-key");
      const category = event.target.value;
      if (!topic || !category) {
        return;
      }
      // Date range isn't a discrete-value category — activate the
      // dedicated pill instead of adding to the FilterShape matrix.
      // Seeds from / to from the URL's year / month / day so the
      // native date picker opens on the currently-viewed slice
      // rather than today's calendar.
      if (topic === "time" && category === "date-range") {
        setDateRange(seedDateRangeFromUrl(year, month, day));
        setTopicSelector(false);
        return;
      }
      const newFilters = filter.newEmptyCategory(filters, topic, category);
      setTopicSelector(false);
      setFilters(newFilters);
    };

    if (topicSelector) {
      return (
        <>
          <NewTopics defaultValue="" onChange={handleSelect}>
            <NewTopic label="Select..."></NewTopic>
            {filter.topics().map((topic) => (
              <NewTopicGroup
                key={`${topic}`}
                label={t(`stats-topic-${topic}`)}
                data-type="topic"
                data-key={topic}
              >
                {filter
                  .categories(topic)
                  .filter(
                    (category) => !alreadyFilteredCategory(topic, category)
                  )
                  .filter((category) => !(hideMap && LOCATION_CATEGORIES.has(category)))
                  .filter(isBetaAllowed)
                  .map((category) => (
                    <NewCategory key={`${topic}:${category}`} value={category}>
                      {t(`stats-category-${category}`)}
                    </NewCategory>
                  ))}
              </NewTopicGroup>
            ))}
          </NewTopics>
          <BsFillXCircleFill onClick={handleToggleAddTopicClick} />
        </>
      );
    }
    return <BsFillPlusCircleFill onClick={handleToggleAddTopicClick} />;
  };

  return (
    <Root>
      <FilterTitle>
        <BsFillFunnelFill />
      </FilterTitle>
      <FilterContainer>
        {filter
          .topics()
          // Time topic also renders when the date-range pill is
          // active even if no discrete time category is in
          // `filters` — the pill visually sits inside Time, so
          // its activation surfaces the topic block.
          .filter((topic) =>
            topic in filters || (topic === "time" && dateRange !== undefined)
          )
          .map((topic) => (
            <Topic
              key={`filter:${topic}`}
              topic={topic}
              filters={filters}
              setFilters={setFilters}
              uniqueValues={uniqueValues}
              lang={lang}
              countryData={countryData}
              hideMap={hideMap}
              enabled={enabled}
            />
          ))}
        {renderTopicAdder()}
      </FilterContainer>
    </Root>
  );
};
export default Filters;
