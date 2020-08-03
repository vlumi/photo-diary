import React from "react";
import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";
import styled from "styled-components";

import stats from "../../lib/stats";
import filter from "../../lib/filter";

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
const RowNone = styled(Row)`
  background-color: var(--none-color);
`;
const RowLow = styled(Row)`
  background-color: var(--low-color);
`;
const RowMedium = styled(Row)`
  background-color: var(--medium-color);
`;
const RowHigh = styled(Row)`
  background-color: var(--high-color);
`;
const RowExtreme = styled(Row)`
  background-color: var(--extreme-color);
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
const StatsTable = ({ topic, category, filters, setFilters }) => {
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
    // TODO: put to tentative filters first, to allow selecting multiple items...
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
  const renderRows = (category, table) => {
    return table.map((value, i) => {
      const valueKey = stats.decodeTableRowKey(value.key);
      const key = `${topic.key}:${category.key}:${valueKey}`;
      // console.log("render row", category, valueKey, filters);
      if (category in filters && valueKey in filters[category]) {
        return (
          <RowSelected key={key} onClick={handleClick} data-key={valueKey}>
            {renderColumns(value, i)}
          </RowSelected>
        );
      }
      if (value.standardScore < -0.5) {
        return (
          <RowNone key={key} onClick={handleClick} data-key={valueKey}>
            {renderColumns(value, i)}
          </RowNone>
        );
      }
      if (value.standardScore < -0.25) {
        return (
          <RowLow key={key} onClick={handleClick} data-key={valueKey}>
            {renderColumns(value, i)}
          </RowLow>
        );
      }
      if (value.standardScore < 0.25) {
        return (
          <RowMedium key={key} onClick={handleClick} data-key={valueKey}>
            {renderColumns(value, i)}
          </RowMedium>
        );
      }
      if (value.standardScore < 0.5) {
        return (
          <RowHigh key={key} onClick={handleClick} data-key={valueKey}>
            {renderColumns(value, i)}
          </RowHigh>
        );
      }
      return (
        <RowExtreme key={key} onClick={handleClick} data-key={valueKey}>
          {renderColumns(value, i)}
        </RowExtreme>
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
        {renderRows(category.key, category.table)}
      </Block>
    </Root>
  );
};
StatsTable.propTypes = {
  topic: PropTypes.object,
  category: PropTypes.object,
  filters: PropTypes.object.isRequired,
  setFilters: PropTypes.func.isRequired,
};
export default StatsTable;
