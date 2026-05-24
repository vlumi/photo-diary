import React from "react";
import styled from "@emotion/styled";
import { BsArrowsFullscreen } from "react-icons/bs";

import Summary from "./Summary";
import Charts from "./Charts";
import Table from "./Table";
import TableModal from "./TableModal";

import type { Filters as FiltersT } from "../../../lib/filter";
import type { StatsTopic, StatsCategory } from "../../../lib/stats";

// Uniform cap: the inline category card always shows at most 10 rows,
// sorted by count desc, regardless of how many entries the
// distribution has or what its natural sort order is. The full
// distribution lives in the modal (opened via the title click), so
// nothing's hidden — the inline view is just a consistent "top 10".
const INLINE_TABLE_LIMIT = 10;

type ActiveTheme = { get: (name: string) => string };

const Root = styled.div`
  width: 330px;
  margin: 0 1px 2px;
`;
// Title is the always-available click target for the expand modal —
// covers categories with ≤ INLINE_TABLE_LIMIT rows too (where the
// "+ N more…" row at the bottom of the table would otherwise not
// appear). The fullscreen-arrows icon on the right makes the
// affordance discoverable; the hover border gives a hint that the
// whole bar is interactive.
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
  cursor: pointer;
  user-select: none;
  position: relative;
  &:hover {
    border-color: var(--primary-color);
  }
`;
const ExpandIcon = styled.span`
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 0.55em;
  color: var(--header-sub-color);
  display: inline-flex;
  align-items: center;
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
  const openModal = () => setModalOpen(true);
  return (
    <Root
      key={`${topic.key}:${category.key}`}
      data-type="category"
      data-key={category.key}
    >
      <Title onClick={openModal}>
        {category.title}
        <ExpandIcon aria-hidden="true">
          <BsArrowsFullscreen />
        </ExpandIcon>
      </Title>
      <Summary category={category} />
      <Charts category={category} />
      <Table
        topic={topic}
        category={category}
        filters={filters}
        setFilters={setFilters}
        theme={theme}
        limit={INLINE_TABLE_LIMIT}
        onExpand={openModal}
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
