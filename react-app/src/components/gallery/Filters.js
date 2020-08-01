import React from "react";
import PropTypes from "prop-types";
import styled from "styled-components";
import { useTranslation } from "react-i18next";
import { BsFillXCircleFill } from "react-icons/bs";
import FlagIcon from "../FlagIcon";

import filter from "../../lib/filter";
import format from "../../lib/format";
import stats from "../../lib/stats";

const Root = styled.div`
  width: 100%;
  display: flex;
  flex-wrap: nowrap;
  align-items: stretch;
  justify-content: flex-start;
`;
const FilterTitle = styled.h3`
  text-align: left;
  writing-mode: vertical-rl;
`;
const FilterContainer = styled.div`
  flex-grow: 1;
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: flex-start;
`;
const FilterTopic = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-start;
  align-items: center;
  padding: 2px 10px;
  border-style: solid;
  border-width: 1px;
  border-radius: 20px;
  border-color: var(--header-background);
`;
const FilterCategory = styled.div`
  color: var(--header-color);
  background-color: var(--header-background);
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-start;
  align-items: center;
  padding: 2px 10px;
  margin: 0 0 0 5px;
  border-radius: 15px;
`;
const ValueBox = styled.div`
  color: var(--primary-color);
  background-color: var(--primary-background);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 2px 5px;
  margin: 0 0 0 5px;
  border-radius: 10px;
  cursor: pointer;
`;
const Value = styled.div`
  padding: 0 5px;
`;

const Filters = ({ filters, setFilters, lang, countryData }) => {
  const { t } = useTranslation();

  const formatCategoryValue = format.categoryValue(lang, t, countryData);

  if (!Object.keys(filters).length) {
    return <></>;
  }
  const handleClick = (event) => {
    const keyElement = event.target.closest("[data-type=value");
    const categoryElement = event.target.closest("[data-type=category]");

    if (!keyElement || !categoryElement) {
      return;
    }
    const category = categoryElement.getAttribute("data-key");
    const key = keyElement.getAttribute("data-key");

    if (!category || !key) {
      return;
    }
    const newFilters = filter.applyNewFilter(
      filters,
      category,
      key,
      stats.UNKNOWN
    );
    setFilters(newFilters);
  };

  const activeFilters = filter.categoriesByTopic
    .map((topic) => {
      return {
        ...topic,
        value: topic.value
          .filter((category) => category in filters)
          .map((category) => {
            return { key: category, value: Object.keys(filters[category]) };
          }),
      };
    })
    .filter((topic) => topic.value.length);

  const renderValue = (category, value) => {
    if (value === stats.UNKNOWN) {
      return t("stats-unknown");
    }
    if (category.key === "country" && countryData.isValid(value)) {
      return (
        <Value>
          <FlagIcon code={value} /> {formatCategoryValue(category.key)(value)}
        </Value>
      );
    }
    return <Value>{formatCategoryValue(category.key)(value)}</Value>;
  };
  return (
    <Root>
      <FilterTitle>Filters</FilterTitle>
      <FilterContainer>
        {activeFilters.map((topic) => (
          <FilterTopic key={`filter:${topic.key}`}>
            {t(`stats-topic-${topic.key}`)}
            {topic.value.map((category) => (
              <FilterCategory
                key={`filter:${topic.key}:${category.key}`}
                data-type="category"
                data-key={category.key}
              >
                {t(`stats-category-${category.key}`)}
                {category.value.map((value) => (
                  <ValueBox
                    key={`filter:${topic.key}:${category.key}:${value}`}
                    data-type="value"
                    data-key={value}
                    onClick={handleClick}
                  >
                    {renderValue(category, value)}
                    <BsFillXCircleFill />
                  </ValueBox>
                ))}
              </FilterCategory>
            ))}
          </FilterTopic>
        ))}
      </FilterContainer>
    </Root>
  );
};
Filters.propTypes = {
  filters: PropTypes.object.isRequired,
  setFilters: PropTypes.func.isRequired,
  lang: PropTypes.string.isRequired,
  countryData: PropTypes.object.isRequired,
};
export default Filters;
