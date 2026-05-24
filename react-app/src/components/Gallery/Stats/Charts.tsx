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
  // Passed by the modal only. When omitted (the inline view),
  // charts render in the natural order from `collectTopics` — no
  // re-sort. The modal's "Top" mode re-zips by count desc; the
  // modal's "By value" mode re-zips alphabetically for
  // `valueSortByLabel` categories and otherwise no-ops.
  sortMode?: SortMode;
}

// Line and polar charts encode shape via position: the year-month
// trend line is meaningless when sorted by count, and the cyclical
// polar charts (month / weekday / hour) lose their wheel arrangement.
// Doughnut and horizontal-bar are agnostic — segments and bars can
// land in any order — so the modal toggle only re-zips those.
const isReorderable = (type: ChartSpec["type"]): boolean =>
  type === "doughnut" || type === "horizontal-bar";

// Re-zip labels + each dataset's data (and backgroundColor where
// present) in `order`. Datasets without a `data` array pass through.
const applyOrder = (data: any, order: number[]): any => {
  if (!data?.datasets?.[0]?.data) {
    return data;
  }
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

const sortByCountDesc = (data: any): any => {
  if (!data?.datasets?.[0]?.data) return data;
  const counts: number[] = data.datasets[0].data.map((v: unknown) => Number(v));
  const order = counts
    .map((_, i) => i)
    .sort((a, b) => counts[b] - counts[a]);
  return applyOrder(data, order);
};

// Labels are JSON-stringified display strings (or JSON-stringified
// arrays for camera-lens). Stringified form sorts cleanly for our
// purposes — comparing `"Apple"` vs `"Banana"` (raw bytes) gives the
// expected alphabetical order, and the camera-lens `["A","B"]` form
// stays well-ordered too.
const sortByLabelAsc = (data: any): any => {
  if (!data?.labels) return data;
  const labels: string[] = data.labels;
  const order = labels
    .map((_, i) => i)
    .sort((a, b) => labels[a].localeCompare(labels[b]));
  return applyOrder(data, order);
};

const Charts = ({ category, sortMode }: Props): React.ReactElement => {
  if (!category.charts) {
    return <></>;
  }
  const transform: ((data: any) => any) | null =
    sortMode === "count"
      ? sortByCountDesc
      : sortMode === "value" && category.valueSortByLabel
        ? sortByLabelAsc
        : null;
  const charts: ChartSpec[] = transform
    ? category.charts.map((chart) =>
        isReorderable(chart.type)
          ? { ...chart, data: transform(chart.data) }
          : chart
      )
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
