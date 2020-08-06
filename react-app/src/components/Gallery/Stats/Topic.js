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
  border-radius: 10px 0;
`;
const Categories = styled.section`
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-start;
`;
const Topic = ({ topic, filters, setFilters }) => {
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
};
export default Topic;
