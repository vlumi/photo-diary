import React from "react";
import styled from "@emotion/styled";

import Summary from "./Summary";
import Charts from "./Charts";
import Table from "./Table";
import TableModal from "./TableModal";

import type { Filters as FiltersT } from "../../../lib/filter";
import type { StatsTopic, StatsCategory } from "../../../lib/stats";

// Variable-length count-sorted distributions (cameras, lenses,
// year-months, etc.) get truncated in the inline category card — the
// user can open the full table in a modal via a trailing "+ N more…"
// row. 12 lines up with months and fits a comfortable mobile screen.
//
// Intrinsically-bounded chronological categories are exempt: cutting
// the hour distribution off at noon would hide PM hours entirely;
// month/weekday/orientation are short enough to render fully anyway
// and the cap was making them feel arbitrary too.
const INLINE_TABLE_LIMIT = 12;
const ALWAYS_FULL_CATEGORIES = new Set([
  "hour",
  "weekday",
  "month",
  "orientation",
]);

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
  topic: StatsTopic;
  category: StatsCategory;
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
  const [modalOpen, setModalOpen] = React.useState(false);
  const limit = ALWAYS_FULL_CATEGORIES.has(category.key)
    ? undefined
    : INLINE_TABLE_LIMIT;
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
        limit={limit}
        onExpand={() => setModalOpen(true)}
      />
      {modalOpen && (
        <TableModal
          topic={topic}
          category={category}
          filters={filters}
          setFilters={setFilters}
          theme={theme}
          onClose={() => setModalOpen(false)}
        />
      )}
    </Root>
  );
};
export default Category;
