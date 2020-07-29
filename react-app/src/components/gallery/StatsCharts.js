import React from "react";
import PropTypes from "prop-types";
import styled from "styled-components";

import { Doughnut, Polar, HorizontalBar, Line } from "react-chartjs-2";

const Root = styled.div`
  margin: 5px;
  width: 100%;
  height: 200px;
  display: flex;
  justify-content: center;
  align-items: stretch;
  flex-wrap: nowrap;
`;
const StyledChartContainer = styled.div`
  width: 150px;
  flex-grow: 1;
  flex-shrink: 1;
  margin: 0 2px;
`;

const StatsCharts = ({ category }) => {
  if (!("charts" in category) || !category.charts) {
    return <></>;
  }
  return (
    <Root>
      {category.charts.map((chart) => {
        const key = `${category.name}:${chart.type}`;
        switch (chart.type) {
          case "doughnut":
            return (
              <StyledChartContainer key={key}>
                <Doughnut data={chart.data} options={chart.options} />
              </StyledChartContainer>
            );
          case "polar":
            return (
              <StyledChartContainer key={key}>
                <Polar data={chart.data} options={chart.options} />
              </StyledChartContainer>
            );
          case "horizontal-bar":
            return (
              <StyledChartContainer key={key}>
                <HorizontalBar data={chart.data} options={chart.options} />
              </StyledChartContainer>
            );
          case "line":
            return (
              <StyledChartContainer key={key}>
                <Line data={chart.data} options={chart.options} />
              </StyledChartContainer>
            );
          default:
            return <></>;
        }
      })}
    </Root>
  );
};
StatsCharts.propTypes = {
  category: PropTypes.object,
};
export default StatsCharts;
