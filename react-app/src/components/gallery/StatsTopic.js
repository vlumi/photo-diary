import React from "react";
import PropTypes from "prop-types";
import styled from "styled-components";

import StatsCategory from "./StatsCategory";

const Root = styled.section`
  width: 100%;
  display: flex;
  flex-wrap: nowrap;
  justify-content: flex-start;
`;
const Title = styled.h3`
  text-align: left;
  writing-mode: vertical-rl;
`;
const Categories = styled.section`
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-start;
`;
const StatsTopic = ({ topic, lang }) => {
  return (
    <Root key={topic.name} name={topic.name}>
      <Title>{topic.title}</Title>
      <Categories>
        {topic.categories.map((category) => (
          <StatsCategory
            key={`${category.name}:${topic.name}`}
            topic={topic}
            category={category}
            lang={lang}
          />
        ))}
      </Categories>
    </Root>
  );
};
StatsTopic.propTypes = {
  topic: PropTypes.object,
  lang: PropTypes.string.isRequired,
};
export default StatsTopic;
