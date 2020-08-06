import React from "react";
import PropTypes from "prop-types";
import styled from "styled-components";

import Summary from "./Summary";
import Charts from "./Charts";
import Table from "./Table";

const Root = styled.div`
  width: 330px;
  margin: 0 1px 2px;
`;
const Title = styled.h3`
  color: var(--header-color);
  background: var(--header-background);
  font-size: 18pt;
  text-align: center;
  margin: 1px;
  padding: 5px 3px;
  border-style: solid;
  border-width: 1px;
  border-color: var(--header-background);
  border-radius: 5px;
`;
const Category = ({ topic, category, filters, setFilters }) => {
  return (
    <Root
      key={`${topic.key}:${category.key}`}
      data-type="category"
      data-key={category.key}
    >
      <Title>{category.title}</Title>
      <Summary category={category} />
      <Charts category={category} />
      <Table
        topic={topic}
        category={category}
        filters={filters}
        setFilters={setFilters}
      />
    </Root>
  );
};
Category.propTypes = {
  topic: PropTypes.object,
  category: PropTypes.object,
  filters: PropTypes.object.isRequired,
  setFilters: PropTypes.func.isRequired,
};
export default Category;
