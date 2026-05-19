import React from "react";
import styled from "@emotion/styled";

import Summary from "./Summary";
import Charts from "./Charts";
import Table from "./Table";

import type { Filters as FiltersT } from "../../../lib/filter";

type ActiveTheme = { get: (name: string) => string };

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

interface Props {
  topic: any;
  category: any;
  filters: FiltersT;
  setFilters: (filters: FiltersT) => void;
  theme: ActiveTheme;
}

const Category = ({
  topic,
  category,
  filters,
  setFilters,
  theme,
}: Props): React.ReactElement => {
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
        theme={theme}
      />
    </Root>
  );
};
export default Category;
