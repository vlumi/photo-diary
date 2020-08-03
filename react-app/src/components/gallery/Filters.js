import React from "react";
import PropTypes from "prop-types";
import styled from "styled-components";
import { useTranslation } from "react-i18next";
import { BsFillXCircleFill, BsFillPlusCircleFill } from "react-icons/bs";
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
const Box = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 2px 5px;
  margin: 0 5px;
  border-radius: 10px;
  cursor: pointer;
`;
// TODO: design
const FilterTitle = styled.h3`
  text-align: left;
  writing-mode: vertical-rl;
`;
const FilterContainer = styled.div`
  flex-grow: 1;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-start;
`;
const FilterTopic = styled.div`
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
const TopicBox = styled(Box)``;
const Topic = styled.div`
  padding: 0 5px;
`;
const FilterCategory = styled.div`
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
const ValueBox = styled(Box)`
  color: var(--primary-color);
  background-color: var(--primary-background);
`;
const Value = styled.div`
  padding: 0 5px;
`;
const NewValues = styled.select`
  margin: 0 5px;
`;
const NewValue = styled.option``;

const Filters = ({ filters, setFilters, uniqueValues, lang, countryData }) => {
  const [topicSelector, setTopicSelector] = React.useState(false);
  const [categorySelector, setCategorySelector] = React.useState({});
  const [valueSelector, setValueSelector] = React.useState({});

  const { t } = useTranslation();

  const formatCategoryValue = format.categoryValue(lang, t, countryData);

  // if (!Object.keys(filters).length) {
  //   return <></>;
  // }
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
  const handleRemoveValueClick = (event) => {
    const topicElement = event.target.closest("[data-type=topic]");
    const categoryElement = event.target.closest("[data-type=category]");
    const valueElement = event.target.closest("[data-type=value");
    if (!categoryElement || !valueElement) {
      return;
    }
    const topic = topicElement.getAttribute("data-key");
    const category = categoryElement.getAttribute("data-key");
    const value = valueElement.getAttribute("data-key");
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
    setFilters(newFilters);
  };
  const handleToggleAddTopicClick = () => {
    setTopicSelector(!topicSelector);
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

  const renderValue = (category, value) => {
    if (value === stats.UNKNOWN) {
      return t("stats-unknown");
    }
    if (category === "country" && countryData.isValid(value)) {
      return (
        <Value>
          <FlagIcon code={value} /> {formatCategoryValue(category)(value)}
        </Value>
      );
    }
    return <Value>{formatCategoryValue(category)(value)}</Value>;
  };
  const renderTopicAdder = () => {
    const handleSelect = (event) => {
      const topic = event.target.value;
      if (!topic) {
        return;
      }
      const newFilters = filter.newEmptyTopic(filters, topic);
      setTopicSelector(false);
      setFilters(newFilters);
    };
    const alreadyFiltered = (topic) => topic in filters;
    if (topicSelector) {
      const topicsLeft = filter.topics().filter(
        (topic) => !alreadyFiltered(topic)
      );
      return (
        <>
          <NewValues defaultValue="" onChange={handleSelect}>
            <NewValue value="">Select...</NewValue>
            {topicsLeft.map((value) => (
              <NewValue key={`${value}`} value={value}>
                {t(`stats-topic-${value}`)}
              </NewValue>
            ))}
          </NewValues>
          <BsFillXCircleFill onClick={handleToggleAddTopicClick} />
        </>
      );
    }
    return <BsFillPlusCircleFill onClick={handleToggleAddTopicClick} />;
  };
  const renderCategoryAdder = (topic) => {
    const handleSelect = (event) => {
      const topicElement = event.target.closest("[data-type=topic]");
      if (!topicElement) {
        return;
      }
      const topic = topicElement.getAttribute("data-key");
      const category = event.target.value;
      if (!topic || !category) {
        return;
      }
      const newFilters = filter.newEmptyCategory(filters, topic, category);
      setCategorySelector({});
      setFilters(newFilters);
    };
    if (topic in categorySelector && categorySelector[topic]) {
      const alreadyFiltered = (category) =>
        topic in filters && category in filters[topic];
      if (alreadyFiltered.length >= filters[topic].length) {
        return <></>;
      }
      const categoriesLeft = filter
        .categories(topic)
        .filter((category) => !alreadyFiltered(category));
      if (!categoriesLeft.length) {
        return <></>;
      }
      return (
        <>
          <NewValues defaultValue="" onChange={handleSelect}>
            <NewValue value="">Select...</NewValue>
            {categoriesLeft.map((value) => (
              <NewValue key={`${topic}:${value}`} value={value}>
                {t(`stats-category-${value}`)}
              </NewValue>
            ))}
          </NewValues>
          <BsFillXCircleFill onClick={handleToggleAddCategoryClick} />
        </>
      );
    }
    return <BsFillPlusCircleFill onClick={handleToggleAddCategoryClick} />;
  };
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
    if (
      topic in valueSelector &&
      category in valueSelector[topic] &&
      valueSelector[topic][category]
    ) {
      const alreadyFiltered = (value) =>
        topic in filters &&
        category in filters[topic] &&
        value.key in filters[topic][category];
      const valuesLeft = uniqueValues[topic][category].filter(
        (value) => !alreadyFiltered(value)
      );
      if (!valuesLeft.length) {
        return <></>;
      }
      return (
        <>
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
          <BsFillXCircleFill onClick={handleToggleAddValueClick} />
        </>
      );
    }
    return <BsFillPlusCircleFill onClick={handleToggleAddValueClick} />;
  };
  return (
    <Root>
      {/* TODO: i18n */}
      <FilterTitle>Filters</FilterTitle>
      <FilterContainer>
        {filter.topics()
          .filter((topic) => topic in filters)
          .map((topic) => (
            <FilterTopic
              key={`filter:${topic}`}
              data-type="topic"
              data-key={topic}
            >
              <TopicBox onClick={handleRemoveTopicClick}>
                <Topic>{t(`stats-topic-${topic}`)}</Topic>
                <BsFillXCircleFill />
              </TopicBox>
              {filter
                .categories(topic)
                .filter((category) => category in filters[topic])
                .map((category) => (
                  <FilterCategory
                    key={`filter:${topic}:${category}`}
                    data-type="category"
                    data-key={category}
                  >
                    <CategoryBox onClick={handleRemoveCategoryClick}>
                      <Category>{t(`stats-category-${category}`)}</Category>
                      <BsFillXCircleFill />
                    </CategoryBox>
                    {Object.keys(filters[topic][category]).map((value) => (
                      <ValueBox
                        key={`filter:${topic}:${category}:${value}`}
                        data-type="value"
                        data-key={value}
                        onClick={handleRemoveValueClick}
                      >
                        {renderValue(category, value)}
                        <BsFillXCircleFill />
                      </ValueBox>
                    ))}
                    {renderValueAdder(topic, category)}
                  </FilterCategory>
                ))}
              {renderCategoryAdder(topic)}
            </FilterTopic>
          ))}
        {renderTopicAdder()}
      </FilterContainer>
    </Root>
  );
};
Filters.propTypes = {
  filters: PropTypes.object.isRequired,
  setFilters: PropTypes.func.isRequired,
  uniqueValues: PropTypes.object.isRequired,
  lang: PropTypes.string.isRequired,
  countryData: PropTypes.object.isRequired,
};
export default Filters;
