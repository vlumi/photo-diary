import React from "react";
import PropTypes from "prop-types";
import styled from "styled-components";

import StatsSummary from "./StatsSummary";
import StatsCharts from "./StatsCharts";
import StatsTable from "./StatsTable";

const Root = styled.div`
  width: 330px;
  margin: 0 1px 2px;
`;
const Title = styled.h3``;
const StatsCategory = ({ topic, category, filters, setFilters }) => {
  return (
    <Root
      key={`${topic.key}:${category.key}`}
      data-type="category"
      data-key={category.key}
    >
      <Title>{category.title}</Title>
      <StatsSummary category={category} />
      <StatsCharts category={category} />
      <StatsTable
        topic={topic}
        category={category}
        filters={filters}
        setFilters={setFilters}
      />
    </Root>
  );
};
StatsCategory.propTypes = {
  topic: PropTypes.object,
  category: PropTypes.object,
  filters: PropTypes.object.isRequired,
  setFilters: PropTypes.func.isRequired,
};
export default StatsCategory;
