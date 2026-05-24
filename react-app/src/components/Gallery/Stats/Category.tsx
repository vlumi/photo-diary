import React from "react";
import styled from "@emotion/styled";
import { BsArrowsFullscreen } from "react-icons/bs";

import Summary from "./Summary";
import Charts from "./Charts";
import Table from "./Table";
import TableModal from "./TableModal";
import SummaryModal from "./SummaryModal";

import type { Filters as FiltersT } from "../../../lib/filter";
import type { StatsTopic, StatsCategory } from "../../../lib/stats";

interface CountryData {
  getName(code: string, lang: string): string | undefined;
  isValid(code: string): boolean;
}

// Uniform cap: the inline category card always shows at most 10 rows,
// sorted by count desc, regardless of how many entries the
// distribution has or what its natural sort order is. The full
// distribution lives in the modal (opened via the title click), so
// nothing's hidden — the inline view is just a consistent "top 10".
const INLINE_TABLE_LIMIT = 10;

type ActiveTheme = { get: (name: string) => string };

// Width comes from the parent Topic's grid — see Topic.tsx — so tiles
// fill the available row width evenly. `min-width: 0` so the grid
// cell can shrink below its content's intrinsic width on narrow
// viewports.
const Root = styled.div`
  margin: 0 0 2px;
  min-width: 0;
`;
// Title is the click target for the expand modal when there's
// something to expand (a data category — chart + table). For the
// summary category (KPIs only, no table) the title doesn't open a
// modal because the modal would be empty.
const Title = styled.h3<{ $clickable?: boolean }>`
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
  user-select: none;
  position: relative;
  ${({ $clickable }) =>
    $clickable
      ? `
        cursor: pointer;
        &:hover {
          border-color: var(--primary-color);
        }
      `
      : ""}
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
  lang: string;
  countryData: CountryData;
}

const Category = ({
  topic,
  category,
  filters,
  setFilters,
  theme,
  lang,
  countryData,
}: Props): React.ReactElement => {
  const [modalOpen, setModalOpen] = React.useState(false);
  // Two flavours of modal:
  // - Chart + table categories use TableModal (full distribution).
  // - The summary category uses SummaryModal (period / peaks / variety
  //   / most-used overview).
  // Either way the category title is the click affordance.
  const hasTable = !!category.table;
  const hasSummaryExtras = !!category.summaryExtras;
  const hasExpandableContent = hasTable || hasSummaryExtras;
  const openModal = hasExpandableContent
    ? () => setModalOpen(true)
    : undefined;
  return (
    <Root
      key={`${topic.key}:${category.key}`}
      data-type="category"
      data-key={category.key}
    >
      <Title onClick={openModal} $clickable={hasExpandableContent}>
        {category.title}
        {hasExpandableContent && (
          <ExpandIcon aria-hidden="true">
            <BsArrowsFullscreen />
          </ExpandIcon>
        )}
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
      {modalOpen && hasTable && (
        <TableModal
          topic={topic}
          category={category}
          filters={filters}
          setFilters={setFilters}
          theme={theme}
          onClose={() => setModalOpen(false)}
        />
      )}
      {modalOpen && hasSummaryExtras && !hasTable && (
        <SummaryModal
          category={category}
          lang={lang}
          countryData={countryData}
          onClose={() => setModalOpen(false)}
        />
      )}
    </Root>
  );
};
export default Category;
