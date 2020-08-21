import React from "react";
import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";
import styled from "styled-components";

import color from "../../../lib/color";
import stats from "../../../lib/stats";
import filter from "../../../lib/filter";

const Root = styled.table`
  width: 100%;
  text-align: left;
  margin: 0;
  padding: 0;
  font-size: small;
  border-spacing: 0;
  border-collapse: collapse;
`;
const Block = styled.tbody``;
const HeaderRow = styled.tr``;
const Row = styled.tr`
  cursor: pointer;
  &:hover {
    color: var(--header-color);
    background-color: var(--header-background);
  }
`;
const RowSelected = styled(Row)`
  color: var(--header-color);
  background-color: var(--header-background);
`;
const RowHeat = styled(Row)`
  background-color: ${(props) => props.color};
`;
const RowNone = styled(Row)`
  color: var(--inactive-color);
`;
const Header = styled.th`
  font-weight: bold;
  padding: 0 2px;
  vertical-align: top;
  text-align: ${(props) => props.align};
  overflow: hidden;
`;
const RowHeader = styled(Header)`
  text-align: right;
  width: 1em;
`;
const Column = styled.td`
  padding: 0 2px;
  vertical-align: top;
  text-align: ${(props) => props.align};
  overflow: hidden;
`;

const cachedHeatColors = {
  from: undefined,
  to: undefined,
  values: [],
};
const getHeatColors = (theme) => {
  const gradientFrom = theme.get("primary-background");
  const gradientTo = theme.get("inactive-color");
  if (
    cachedHeatColors.from === gradientFrom &&
    cachedHeatColors.to === gradientTo
  ) {
    return cachedHeatColors.values;
  }
  cachedHeatColors.from = gradientFrom;
  cachedHeatColors.to = gradientTo;
  cachedHeatColors.values = color.colorGradient(gradientFrom, gradientTo, 10);
  return cachedHeatColors.values;
};

const Table = ({ topic, category, filters, setFilters, theme }) => {
  const { t } = useTranslation();

  const handleClick = (event) => {
    const topicElement = event.target.closest("[data-type=topic]");
    const categoryElement = event.target.closest("[data-type=category]");
    const keyElement = event.target.closest("tr");

    if (!keyElement || !categoryElement) {
      return;
    }
    const topic = topicElement.getAttribute("data-key");
    const category = categoryElement.getAttribute("data-key");
    const key = keyElement.getAttribute("data-key");

    if (!category || !key) {
      return;
    }
    const newFilters = filter.applyNewFilter(
      filters,
      topic,
      category,
      key,
      stats.UNKNOWN
    );
    setFilters(newFilters);
  };

  if (!("table" in category) || !category.table) {
    return <></>;
  }
  const renderColumns = (values, i) => {
    return category.tableColumns.map((column) =>
      column.header ? (
        <RowHeader
          key={`${topic.key}:${category.key}:${i}${column.title}`}
          align={column.align}
        >
          {values[column.title]}
        </RowHeader>
      ) : (
        <Column
          key={`${topic.key}:${category.key}:${i}${column.title}`}
          align={column.align}
        >
          {values[column.title]}
        </Column>
      )
    );
  };
  const getScoreColor = (score) => {
    const heatColors = getHeatColors(theme);
    if (score < -1) return heatColors[0];
    if (score < -0.75) return heatColors[1];
    if (score < -0.5) return heatColors[2];
    if (score < -0.25) return heatColors[3];
    if (score < -0.125) return heatColors[4];
    if (score < 0.125) return heatColors[5];
    if (score < 0.25) return heatColors[6];
    if (score < 0.5) return heatColors[7];
    if (score < 0.75) return heatColors[8];
    return heatColors[9];
  };
  const renderRows = (topic, category, table) => {
    return table.map((value, i) => {
      const valueKey = stats.decodeTableRowKey(value.key);
      const key = `${topic.key}:${category.key}:${valueKey}`;
      if (
        topic in filters &&
        category in filters[topic] &&
        valueKey in filters[topic][category]
      ) {
        return (
          <RowSelected key={key} onClick={handleClick} data-key={valueKey}>
            {renderColumns(value, i)}
          </RowSelected>
        );
      }

      if (value.count === "0") {
        return (
          <RowNone
            key={key}
            onClick={handleClick}
            data-key={valueKey}
            color={getScoreColor(value.standardScore)}
          >
            {renderColumns(value, i)}
          </RowNone>
        );
      }
      return (
        <RowHeat
          key={key}
          onClick={handleClick}
          data-key={valueKey}
          color={getScoreColor(value.standardScore)}
        >
          {renderColumns(value, i)}
        </RowHeat>
      );
    });
  };

  return (
    <Root>
      <Block>
        <HeaderRow>
          {category.tableColumns.map((column) => (
            <Header
              key={`${topic.key}:header:${column.title}`}
              align={column.align}
            >
              {t(`stats-col-${column.title}`)}
            </Header>
          ))}
        </HeaderRow>
        {renderRows(topic.key, category.key, category.table)}
      </Block>
    </Root>
  );
};
Table.propTypes = {
  topic: PropTypes.object,
  category: PropTypes.object,
  filters: PropTypes.object.isRequired,
  setFilters: PropTypes.func.isRequired,
  theme: PropTypes.object.isRequired,
};
export default Table;
