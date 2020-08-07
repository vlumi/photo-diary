import React from "react";
import PropTypes from "prop-types";
import styled from "styled-components";

import Category from "./Category";

const Root = styled.section`
  width: 100%;
  display: flex;
  flex-wrap: nowrap;
  justify-content: flex-start;
`;
const Title = styled.h3`
  text-align: left;
  writing-mode: vertical-rl;
  color: var(--header-color);
  background: var(--header-background);
  font-size: 18pt;
  margin: 1px;
  padding: 5px 3px;
  border-style: solid;
  border-width: 1px;
  border-color: var(--header-background);
  border-radius: 10px 0;
`;
const Categories = styled.section`
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-start;
`;
const Topic = ({ topic, filters, setFilters, theme }) => {
  return (
    <Root key={topic.key} data-type="topic" data-key={topic.key}>
      <Title>{topic.title}</Title>
      <Categories>
        {topic.categories.map((category) => (
          <Category
            key={`${category.key}:${topic.key}`}
            topic={topic}
            category={category}
            filters={filters}
            setFilters={setFilters}
            theme={theme}
          />
        ))}
      </Categories>
    </Root>
  );
};
Topic.propTypes = {
  topic: PropTypes.object,
  filters: PropTypes.object.isRequired,
  setFilters: PropTypes.func.isRequired,
  theme: PropTypes.object.isRequired,
};
export default Topic;
