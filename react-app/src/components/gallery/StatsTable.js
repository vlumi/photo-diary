import React from "react";
import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";
import styled from "styled-components";

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
const Row = styled.tr`
  &:hover {
    color: var(--header-color);
    background-color: var(--header-background);
  }
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

  const applyNewFilter = (filters, category, key, newFilter) => {
    const newFilters = { ...filters };
    if (!(category in newFilters)) {
      newFilters[category] = { [key]: newFilter };
      return newFilters;
    }
    newFilters[category] = { ...newFilters[category] };
    if (!(key in newFilters[category])) {
      newFilters[category][key] = newFilter;
      return newFilters;
    }
    delete newFilters[category][key];
    if (!Object.keys(newFilters[category]).length) {
      delete newFilters[category];
    }
    return newFilters;
  };

  // TODO: fixed, non-localized key for unknown
  const normalizeKeyValue = (key) => {
    try {
      return JSON.stringify(
        JSON.parse(key).map((part) =>
          part === t("stats-unknown") ? undefined : part
        )
      );
    } catch (e) {
      return key === t("stats-unknown") ? undefined : key;
    }
  };

  const handleClick = (event) => {
    const keyElement = event.target.closest("tr");
    const categoryElement = event.target.closest("[data-type=category]");

    if (!keyElement || !categoryElement) {
      return;
    }
    const category = categoryElement.getAttribute("data-key");
    const key = keyElement.getAttribute("data-key");

    if (!category || !key) {
      return;
    }
    const normalizedKey = normalizeKeyValue(key, t);
    // TODO: put to tentative filters first, to allow selecting multiple items...
    const newFilters = applyNewFilter(filters, category, key, (photo) =>
      photo.matches(category, normalizedKey)
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
  const renderRows = (table) => {
    return table.map((values, i) => (
      <Row
        key={`${topic.key}:${category.key}:${i}`}
        onClick={handleClick}
        data-key={values.key}
      >
        {renderColumns(values, i)}
      </Row>
    ));
  };

  return (
    <Root>
      <Block>
        <Row>
          {category.tableColumns.map((column) => (
            <Header
              key={`${topic.key}:header:${column.title}`}
              align={column.align}
            >
              {t(`stats-col-${column.title}`)}
            </Header>
          ))}
        </Row>
        {renderRows(category.table)}
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
