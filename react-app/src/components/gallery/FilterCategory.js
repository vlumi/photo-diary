import React from "react";
import PropTypes from "prop-types";
import styled from "styled-components";
import { useTranslation } from "react-i18next";
import { BsFillXCircleFill, BsFillPlusCircleFill } from "react-icons/bs";

import FilterValue from "./FilterValue";

import filter from "../../lib/filter";
import stats from "../../lib/stats";

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
const Category = styled.div`
  padding: 0 5px;
`;
const NewValues = styled.select`
  margin: 0 5px;
`;
const NewValue = styled.option``;

const FilterCategory = ({
  topic,
  category,
  filters,
  setFilters,
  uniqueValues,
  lang,
  countryData,
}) => {
  const [valueSelector, setValueSelector] = React.useState({});

  const { t } = useTranslation();

  const handleRemoveCategoryClick = (event) => {
    const topicElement = event.target.closest("[data-type=topic]");
    const categoryElement = event.target.closest("[data-type=category]");
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

  const handleToggleAddValueClick = (event) => {
    const topicElement = event.target.closest("[data-type=topic]");
    const categoryElement = event.target.closest("[data-type=category]");
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

  const alreadyFilteredValue = (topic, category, value) =>
    topic in filters &&
    category in filters[topic] &&
    value.key in filters[topic][category];

  const renderValueAdder = (topic, category) => {
    const handleSelect = (event) => {
      const topicElement = event.target.closest("[data-type=topic]");
      const categoryElement = event.target.closest("[data-type=category]");
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
        <Category>{t(`stats-category-${category}`)}</Category>
        <BsFillXCircleFill />
      </CategoryBox>
      {Object.keys(filters[topic][category]).map((value) => (
        <FilterValue
          key={`filter:${topic}:${category}:${value}`}
          topic={topic}
          category={category}
          value={value}
          filters={filters}
          setFilters={setFilters}
          uniqueValues={uniqueValues}
          lang={lang}
          countryData={countryData}
        />
      ))}
      {renderValueAdder(topic, category)}
    </Root>
  );
};
FilterCategory.propTypes = {
  topic: PropTypes.string.isRequired,
  category: PropTypes.string.isRequired,
  filters: PropTypes.object.isRequired,
  setFilters: PropTypes.func.isRequired,
  uniqueValues: PropTypes.object.isRequired,
  lang: PropTypes.string.isRequired,
  countryData: PropTypes.object.isRequired,
};
export default FilterCategory;
