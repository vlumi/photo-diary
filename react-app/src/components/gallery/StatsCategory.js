import React from "react";
import PropTypes from "prop-types";
import styled from "styled-components";

import StatsSummary from "./StatsSummary";
import StatsCharts from "./StatsCharts";
import StatsRaw from "./StatsRaw";

const Root = styled.div`
  width: 330px;
  margin: 0 1px 2px;
`;
const Title = styled.h3``;
const StatsCategory = ({ topic, category }) => {
  return (
    <Root key={`${topic.name}:${category.name}`}>
      <Title>{category.title}</Title>
      <StatsSummary category={category} />
      <StatsCharts category={category} />
      <StatsRaw topic={topic} category={category} />
    </Root>
  );
};
StatsCategory.propTypes = {
  topic: PropTypes.object,
  category: PropTypes.object,
};
export default StatsCategory;
