import React from "react";
import styled from "@emotion/styled";

import Summary from "./Summary";
import Charts from "./Charts";
import Table from "./Table";
import TableModal from "./TableModal";

import type { Filters as FiltersT } from "../../../lib/filter";
import type { StatsTopic, StatsCategory } from "../../../lib/stats";

// Threshold-based capping: show every row inline when the distribution
// is short enough that the user can scan the whole thing comfortably;
// cap at INLINE_TABLE_LIMIT once it gets longer. The threshold of 24
// covers every intrinsically-bounded category (hour=24, weekday=7,
// month=12, orientation=3) plus the exposure settings that usually
// land under 24 (aperture, ISO, often focal-length). Long distributions
// (cameras/lenses on busy galleries, year-month on multi-year
// galleries, dense exposure-time/focal-length) get the cap + expand
// modal.
const INLINE_TABLE_LIMIT = 10;
const INLINE_AUTO_FULL_BELOW = 24;

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
  const rowCount = category.table?.length ?? 0;
  const limit =
    rowCount > INLINE_AUTO_FULL_BELOW ? INLINE_TABLE_LIMIT : undefined;
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
