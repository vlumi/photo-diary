import React from "react";
import styled from "@emotion/styled";
import { useTranslation } from "react-i18next";
import { BsFillXCircleFill, BsFillPlusCircleFill } from "react-icons/bs";

import Value from "./Value";

import filter, { type Filters as FiltersT } from "../../../lib/filter";
import stats, {
  type UniqueValues,
  type UniqueValueEntry,
} from "../../../lib/stats";

interface CountryData {
  getName(code: string, lang: string): string | undefined;
  isValid(code: string): boolean;
}

const Box = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 2px 5px;
  margin: 0 5px;
  border-radius: 10px;
  cursor: pointer;
`;
const Root = styled.div`
  color: var(--header-color);
  background-color: var(--header-background);
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-start;
  align-items: center;
  padding: 2px 5px;
  margin: 0 5px;
  border-radius: 15px;
`;
const CategoryBox = styled(Box)``;
const Title = styled.div`
  padding: 0 5px;
`;
const NewValues = styled.select`
  margin: 0 5px;
`;
const NewValue = styled.option``;

interface Props {
  topic: string;
  category: string;
  filters: FiltersT;
  setFilters: (filters: FiltersT) => void;
  uniqueValues: UniqueValues;
  lang: string;
  countryData: CountryData;
}

const Category = ({
  topic,
  category,
  filters,
  setFilters,
  uniqueValues,
  lang,
  countryData,
}: Props): React.ReactElement => {
  const [valueSelector, setValueSelector] = React.useState<
    Record<string, Record<string, boolean>>
  >({});

  const { t } = useTranslation();

  const handleRemoveCategoryClick = (event: React.MouseEvent) => {
    const target = event.target as HTMLElement;
    const topicElement = target.closest("[data-type=topic]");
    const categoryElement = target.closest("[data-type=category]");
    if (!topicElement || !categoryElement) {
      return;
    }
    const topic = topicElement.getAttribute("data-key");
    const category = categoryElement.getAttribute("data-key");
    if (!topic || !category) {
      return;
    }
    const newFilters = filter.removeCategory(filters, topic, category);
    setFilters(newFilters);
  };

  const handleToggleAddValueClick = (event: React.MouseEvent) => {
    const target = event.target as HTMLElement;
    const topicElement = target.closest("[data-type=topic]");
    const categoryElement = target.closest("[data-type=category]");
    if (!topicElement || !categoryElement) {
      return;
    }
    const topic = topicElement.getAttribute("data-key");
    const category = categoryElement.getAttribute("data-key");
    if (!topic || !category) {
      return;
    }
    const state =
      !(topic in valueSelector) ||
      !(category in valueSelector[topic]) ||
      !valueSelector[topic][category];
    setValueSelector({ [topic]: { [category]: state } });
  };

  const alreadyFilteredValue = (
    topic: string,
    category: string,
    value: UniqueValueEntry
  ): boolean =>
    topic in filters &&
    category in filters[topic] &&
    String(value.key) in filters[topic][category];

  const renderValueAdder = (topic: string, category: string) => {
    const handleSelect = (event: React.ChangeEvent<HTMLSelectElement>) => {
      const target = event.target as HTMLElement;
      const topicElement = target.closest("[data-type=topic]");
      const categoryElement = target.closest("[data-type=category]");
      if (!topicElement || !categoryElement) {
        return;
      }
      const topic = topicElement.getAttribute("data-key");
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
      setValueSelector({});
      setFilters(newFilters);
    };
    const noValues = !Object.keys(filters[topic][category]).length;
    if (
      noValues ||
      (topic in valueSelector &&
        category in valueSelector[topic] &&
        valueSelector[topic][category])
    ) {
      const valuesLeft = uniqueValues[topic][category].filter(
        (value) => !alreadyFilteredValue(topic, category, value)
      );
      if (!valuesLeft.length) {
        return <></>;
      }
      const renderOptions = () => {
        return (
          <NewValues defaultValue="" onChange={handleSelect}>
            <NewValue value="">Select...</NewValue>
            {valuesLeft.map((value) => (
              <NewValue
                key={`${topic}:${category}:${value.key}`}
                value={value.key}
              >
                {value.value}
              </NewValue>
            ))}
          </NewValues>
        );
      };
      if (noValues) {
        return renderOptions();
      }
      return (
        <>
          {renderOptions()}
          <BsFillXCircleFill onClick={handleToggleAddValueClick} />
        </>
      );
    }
    return <BsFillPlusCircleFill onClick={handleToggleAddValueClick} />;
  };

  return (
    <Root
      key={`filter:${topic}:${category}`}
      data-type="category"
      data-key={category}
    >
      <CategoryBox onClick={handleRemoveCategoryClick}>
        <Title>{t(`stats-category-${category}`)}</Title>
        <BsFillXCircleFill />
      </CategoryBox>
      {Object.keys(filters[topic][category]).map((value) => (
        <Value
          key={`filter:${topic}:${category}:${value}`}
          topic={topic}
          category={category}
          value={value}
          filters={filters}
          setFilters={setFilters}
          lang={lang}
          countryData={countryData}
        />
      ))}
      {renderValueAdder(topic, category)}
    </Root>
  );
};
export default Category;
