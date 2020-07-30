import React from "react";
import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";
import styled from "styled-components";

const Root = styled.table`
  width: 100%;
  text-align: left;
  margin: 0;
  padding: 0;
  font-size: x-small;
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
const StatsTable = ({ topic, category }) => {
  const { t } = useTranslation();

  if (!("table" in category) || !category.table) {
    return <></>;
  }
  return (
    <Root>
      <Block>
        <Row>
          {category.tableColumns.map((column) => (
            <Header
              key={`${topic.name}:header:${column.title}`}
              align={column.align}
            >
              {t(`stats-col-${column.title}`)}
            </Header>
          ))}
        </Row>
        {category.table.map((values, i) => (
          <Row key={`${topic.name}:${category.name}:${i}`}>
            {values.map((value, j) =>
              category.tableColumns[j].header ? (
                <RowHeader
                  key={`${topic.name}:${category.name}:${i}${j}`}
                  align={category.tableColumns[j].align}
                >
                  {value}
                </RowHeader>
              ) : (
                <Column
                  key={`${topic.name}:${category.name}:${i}${j}`}
                  align={category.tableColumns[j].align}
                >
                  {value}
                </Column>
              )
            )}
          </Row>
        ))}
      </Block>
    </Root>
  );
};
StatsTable.propTypes = {
  topic: PropTypes.object,
  category: PropTypes.object,
};
export default StatsTable;
