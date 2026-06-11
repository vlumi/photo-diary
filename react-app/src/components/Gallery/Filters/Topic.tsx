import React from "react";
import styled from "@emotion/styled";
import { useTranslation } from "react-i18next";
import { BsFillXCircleFill, BsFillPlusCircleFill } from "react-icons/bs";

import Category from "./Category";
import DateRangePill from "./DateRangePill";

import filter, { type Filters as FiltersT } from "../../../lib/filter";
import stats, { type UniqueValues } from "../../../lib/stats";
import type { BetaFeature } from "../../../stores/beta";
import { useFiltersStore } from "../../../stores";

interface CountryData {
  getName(code: string, lang: string): string | undefined;
  isValid(code: string): boolean;
}

const Root = styled.div`
  color: var(--primary-color);
  background-color: var(--primary-background);
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-start;
  align-items: center;
  padding: 2px 5px;
  margin: 0;
  border-style: solid;
  border-width: 1px;
  border-radius: 20px;
  border-color: var(--header-background);
`;
const Box = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 2px 5px;
  margin: 0 5px;
  border-radius: 10px;
  cursor: pointer;
`;
const TopicBox = styled(Box)``;
const Title = styled.div`
  padding: 0 5px;
`;
const NewCategories = styled.select`
  margin: 0 5px;
`;
const NewCategoryGroup = styled.optgroup``;
const NewCategory = styled.option``;
const NewValue = styled.option``;

interface Props {
  topic: string;
  filters: FiltersT;
  setFilters: (filters: FiltersT) => void;
  uniqueValues: UniqueValues;
  lang: string;
  countryData: CountryData;
  hideMap: boolean;
  enabled: Record<BetaFeature, boolean>;
}

// Mirror of Filters/index.tsx.
const LOCATION_CATEGORIES = new Set(["country", "state", "city", "geotagged"]);
const BETA_CATEGORIES: Record<string, BetaFeature> = {
  state: "regions",
  "focal-length-eq": "focalLengthEquiv",
};

const Topic = ({
  topic,
  filters,
  setFilters,
  uniqueValues,
  lang,
  countryData,
  hideMap,
  enabled,
}: Props): React.ReactElement => {
  const isBetaAllowed = (category: string): boolean => {
    const required = BETA_CATEGORIES[category];
    return !required || enabled[required];
  };
  const [categorySelector, setCategorySelector] = React.useState<
    Record<string, boolean>
  >({});
  const dateRange = useFiltersStore((s) => s.dateRange);
  const setDateRange = useFiltersStore((s) => s.setDateRange);

  const { t } = useTranslation();

  const handleRemoveTopicClick = (event: React.MouseEvent) => {
    const topicElement = (event.target as HTMLElement).closest(
      "[data-type=topic]"
    );
    if (!topicElement) {
      return;
    }
    const topic = topicElement.getAttribute("data-key");
    if (!topic) {
      return;
    }
    const newFilters = filter.removeTopic(filters, topic);
    setFilters(newFilters);
    // Removing the Time topic chip also clears the date-range
    // pill — it visually lives inside Time, so the X button on
    // the topic wrapper is the natural "drop everything time".
    if (topic === "time") {
      setDateRange(undefined);
    }
  };

  const handleToggleAddCategoryClick = (event: React.MouseEvent) => {
    const topicElement = (event.target as HTMLElement).closest(
      "[data-type=topic]"
    );
    if (!topicElement) {
      return;
    }
    const topic = topicElement.getAttribute("data-key");
    if (!topic) {
      return;
    }
    const state = !(topic in categorySelector) || !categorySelector[topic];
    setCategorySelector({ [topic]: state });
  };

  const alreadyFilteredValue = (
    topic: string,
    category: string,
    value: { key: string | number }
  ): boolean =>
    topic in filters &&
    category in filters[topic] &&
    String(value.key) in filters[topic][category];

  const renderCategoryAdder = (topic: string) => {
    const handleSelect = (event: React.ChangeEvent<HTMLSelectElement>) => {
      const categoryElement = (
        event.target.querySelector("option:checked") as HTMLElement | null
      )?.closest("[data-type=category]");
      if (!categoryElement) {
        return;
      }
      const category = categoryElement.getAttribute("data-key");
      const value = event.target.value;
      if (!topic || !category || !value) {
        return;
      }
      const newFilters = filter.applyNewFilter(
        filters,
        topic,
        category,
        value,
        stats.UNKNOWN
      );
      setCategorySelector({});
      setFilters(newFilters);
    };
    if (topic in categorySelector && categorySelector[topic]) {
      return (
        <>
          <NewCategories defaultValue="" onChange={handleSelect}>
            <NewCategory value="">Select...</NewCategory>
            {filter
              .categories(topic)
              // `date-range` is structurally different (no discrete
              // values to pick); it's added from the top-level
              // Filters topic adder which activates the dedicated
              // pill. Hide from this per-category adder.
              .filter((category) => category !== "date-range")
              .filter((category) => !(hideMap && LOCATION_CATEGORIES.has(category)))
              .filter(isBetaAllowed)
              .map((category) => (
              <NewCategoryGroup
                key={`${topic}:${category}`}
                label={t(`stats-category-${category}`)}
                data-type="category"
                data-key={category}
              >
                {uniqueValues[topic][category]
                  .filter(
                    (value) => !alreadyFilteredValue(topic, category, value)
                  )
                  .map((value) => (
                    <NewValue
                      key={`${topic}:${category}:${value.key}`}
                      value={value.key}
                    >
                      {value.value}
                    </NewValue>
                  ))}
              </NewCategoryGroup>
            ))}
          </NewCategories>
          <BsFillXCircleFill onClick={handleToggleAddCategoryClick} />
        </>
      );
    }
    return <BsFillPlusCircleFill onClick={handleToggleAddCategoryClick} />;
  };

  return (
    <Root data-type="topic" data-key={topic}>
      <TopicBox onClick={handleRemoveTopicClick}>
        <Title>{t(`stats-topic-${topic}`)}</Title>
        <BsFillXCircleFill />
      </TopicBox>
      {topic === "time" && dateRange !== undefined ? <DateRangePill /> : null}
      {topic in filters
        ? filter
            .categories(topic)
            .filter((category) => category in filters[topic])
            .filter((category) => !(hideMap && LOCATION_CATEGORIES.has(category)))
            .filter(isBetaAllowed)
            .map((category) => (
              <Category
                key={`filter:${topic}:${category}`}
                topic={topic}
                category={category}
                filters={filters}
                setFilters={setFilters}
                uniqueValues={uniqueValues}
                lang={lang}
                countryData={countryData}
              />
            ))
        : null}
      {renderCategoryAdder(topic)}
    </Root>
  );
};
export default Topic;
