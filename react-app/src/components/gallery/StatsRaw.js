import React from "react";
import PropTypes from "prop-types";
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
  text-align: right;
  width: 1em;
`;
const Column = styled.td`
  padding: 0 2px;
  vertical-align: top;
  text-align: ${(props) => props.align};
  overflow: hidden;
`;
const StatsRaw = ({ topic, category }) => {
  if (!("raw" in category) || !category.raw) {
    return <></>;
  }
  return (
    <Root>
      <Block>
        {category.raw.map((values, i) => (
          <Row key={`${topic.name}:${category.name}:${i}`}>
            {category.rawHeader ? <Header>{i + 1}</Header> : <></>}
            {values.map((value, j) => (
              <Column
                key={`${topic.name}:${category.name}:${i}${j}`}
                align={category.rawColumns[j].align}
              >
                {value}
              </Column>
            ))}
          </Row>
        ))}
      </Block>
    </Root>
  );
};
StatsRaw.propTypes = {
  topic: PropTypes.object,
  category: PropTypes.object,
};
export default StatsRaw;
