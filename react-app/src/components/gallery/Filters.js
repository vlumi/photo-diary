import React from "react";
import PropTypes from "prop-types";
import styled from "styled-components";
import { useTranslation } from "react-i18next";
import { BsFillXCircleFill, BsFillPlusCircleFill } from "react-icons/bs";

import FilterTopic from "./FilterTopic";

import filter from "../../lib/filter";

const Root = styled.div`
  width: 100%;
  display: flex;
  flex-wrap: nowrap;
  align-items: stretch;
  justify-content: flex-start;
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
const NewTopics = styled.select`
  margin: 0 5px;
`;
const NewTopic = styled.option``;
const NewTopicGroup = styled.optgroup``;
const NewCategory = styled.option``;

const Filters = ({ filters, setFilters, uniqueValues, lang, countryData }) => {
  const [topicSelector, setTopicSelector] = React.useState(false);

  const { t } = useTranslation();

  const alreadyFilteredCategory = (topic, category) =>
    topic in filters && category in filters[topic];

  const handleToggleAddTopicClick = () => {
    setTopicSelector(!topicSelector);
  };
  const renderTopicAdder = () => {
    const handleSelect = (event) => {
      const topicElement = event.target
        .querySelector("option:checked")
        .closest("[data-type=topic]");
      if (!topicElement) {
        return;
      }
      const topic = topicElement.getAttribute("data-key");
      const category = event.target.value;
      if (!topic || !category) {
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
      {/* TODO: i18n */}
      <FilterTitle>Filters</FilterTitle>
      <FilterContainer>
        {filter
          .topics()
          .filter((topic) => topic in filters)
          .map((topic) => (
            <FilterTopic
              key={`filter:${topic}`}
              topic={topic}
              filters={filters}
              setFilters={setFilters}
              uniqueValues={uniqueValues}
              lang={lang}
              countryData={countryData}
            />
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
