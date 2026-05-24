import React from "react";
import styled from "@emotion/styled";

import "chart.js/auto";
import { Doughnut, PolarArea, Bar, Line } from "react-chartjs-2";

import type { ChartSpec, SortMode, StatsCategory } from "../../../lib/stats";

const Root = styled.div`
  margin: 5px;
  width: 100%;
  height: 250px;
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
const StyledChartContainer2 = styled.div`
  width: 300px;
  flex-grow: 1;
  flex-shrink: 1;
  margin: 0 2px;
`;

interface Props {
  category: StatsCategory;
  // "value" is the category's natural sort (what `collectTopics` built);
  // "count" re-orders labels/data/colors in parallel by count desc.
  // Only meaningful for `valueSortable` categories — pass-through "value"
  // for everything else.
  sortMode?: SortMode;
}

// Re-order the chart's labels + each dataset's data (and backgroundColor
// where present) in parallel by data desc. Datasets without a `data`
// array (none today, but safe) pass through unchanged.
const sortByCountDesc = (data: any): any => {
  if (!data?.datasets?.[0]?.data) {
    return data;
  }
  const counts: number[] = data.datasets[0].data.map((v: unknown) => Number(v));
  const order = counts
    .map((_, i) => i)
    .sort((a, b) => counts[b] - counts[a]);
  const reorder = <T,>(arr: T[]): T[] => order.map((i) => arr[i]);
  return {
    ...data,
    labels: data.labels ? reorder(data.labels) : data.labels,
    datasets: data.datasets.map((ds: any) => ({
      ...ds,
      data: reorder(ds.data),
      ...(Array.isArray(ds.backgroundColor)
        ? { backgroundColor: reorder(ds.backgroundColor) }
        : {}),
    })),
  };
};

const Charts = ({
  category,
  sortMode = "value",
}: Props): React.ReactElement => {
  if (!category.charts) {
    return <></>;
  }
  const charts: ChartSpec[] =
    sortMode === "count"
      ? category.charts.map((chart) => ({
          ...chart,
          data: sortByCountDesc(chart.data),
        }))
      : category.charts;
  return (
    <Root>
      {charts.map((chart) => {
        const key = `${category.key}:${chart.type}`;
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
                <PolarArea data={chart.data} options={chart.options} />
              </StyledChartContainer>
            );
          case "horizontal-bar":
            return (
              <StyledChartContainer key={key}>
                <Bar data={chart.data} options={chart.options} />
              </StyledChartContainer>
            );
          case "line":
            return (
              <StyledChartContainer2 key={key}>
                <Line data={chart.data} options={chart.options} />
              </StyledChartContainer2>
            );
          default:
            return <></>;
        }
      })}
    </Root>
  );
};
export default Charts;
