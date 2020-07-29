import React from "react";
import PropTypes from "prop-types";
import styled from "styled-components";

const Root = styled.div`
  margin: 5px;
  width: 100%;
  height: 200px;
  display: flex;
  justify-content: center;
  align-items: stretch;
  flex-wrap: nowrap;
`;

const StatsSummary = ({ category }) => {
  if (!("kpi" in category) || !category.kpi) {
    return <></>;
  }
  // TODO; format through StatsKpi
  return (
    <Root>
      <ul>
        {category.kpi.map((kpi) => (
          <li key={`kpi:${kpi.key}`}>
            {kpi.key}: {kpi.value}
          </li>
        ))}
      </ul>
    </Root>
  );
};
StatsSummary.propTypes = {
  category: PropTypes.object,
};
export default StatsSummary;
