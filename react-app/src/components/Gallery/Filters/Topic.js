import React from "react";
import PropTypes from "prop-types";
import styled from "styled-components";
import { useTranslation } from "react-i18next";
import { BsFillXCircleFill, BsFillPlusCircleFill } from "react-icons/bs";

import Category from "./Category";

import filter from "../../../lib/filter";
import stats from "../../../lib/stats";

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

const Topic = ({
  topic,
  filters,
  setFilters,
  uniqueValues,
  lang,
  countryData,
}) => {
  const [categorySelector, setCategorySelector] = React.useState({});

  const { t } = useTranslation();

  const handleRemoveTopicClick = (event) => {
    const topicElement = event.target.closest("[data-type=topic]");
    if (!topicElement) {
      return;
    }
    const topic = topicElement.getAttribute("data-key");
    if (!topic) {
      return;
    }
    const newFilters = filter.removeTopic(filters, topic);
    setFilters(newFilters);
  };

  const handleToggleAddCategoryClick = (event) => {
    const topicElement = event.target.closest("[data-type=topic]");
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

  const alreadyFilteredValue = (topic, category, value) =>
    topic in filters &&
    category in filters[topic] &&
    value.key in filters[topic][category];

  const renderCategoryAdder = (topic) => {
    const handleSelect = (event) => {
      const categoryElement = event.target
        .querySelector("option:checked")
        .closest("[data-type=category]");
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
            {filter.categories(topic).map((category) => (
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
      {filter
        .categories(topic)
        .filter((category) => category in filters[topic])
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
        ))}
      {renderCategoryAdder(topic)}
    </Root>
  );
};
Topic.propTypes = {
  topic: PropTypes.string.isRequired,
  filters: PropTypes.object.isRequired,
  setFilters: PropTypes.func.isRequired,
  uniqueValues: PropTypes.object.isRequired,
  lang: PropTypes.string.isRequired,
  countryData: PropTypes.object.isRequired,
};
export default Topic;
