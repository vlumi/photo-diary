import React from "react";
import styled from "@emotion/styled";

import Category from "./Category";

import type { Filters as FiltersT } from "../../../lib/filter";
import type { StatsTopic } from "../../../lib/stats";

type ActiveTheme = { get: (name: string) => string };
interface CountryData {
  getName(code: string, lang: string): string | undefined;
  isValid(code: string): boolean;
}

// Grid (instead of flex) for the title + categories row. Grid items
// stretch in both axes by default, so the vertical title bar reaches
// the full height of the wrapped categories grid in every browser —
// the previous flex layout left it short in Firefox because
// `writing-mode: vertical-rl` makes intrinsic block-size = text
// height rather than the flex stretch.
const Root = styled.section`
  width: 100%;
  display: grid;
  grid-template-columns: auto 1fr;
  align-items: stretch;
`;
const Title = styled.h3`
  text-align: left;
  writing-mode: vertical-rl;
  color: var(--header-color);
  background: var(--header-background);
  font-size: 18pt;
  margin: 1px;
  padding: 5px 3px;
  border-style: solid;
  border-width: 1px;
  border-color: var(--header-background);
  border-radius: 10px 0;
`;
// Responsive tile grid: auto-fill packs as many 330px-wide columns as
// the row can hold, all sharing 1fr so every tile is the same width
// across rows. 330px floor matches the previous fixed-width tile and
// gives the inline charts (~300px combined) enough room to render
// without overflowing. On viewports too narrow to fit a single 330px
// tile (sub-360px phones) the tile overflows by a few pixels — rare
// in practice and a cleaner trade-off than letting the charts squash.
const Categories = styled.section`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(330px, 1fr));
  gap: 2px;
  align-content: start;
  min-width: 0;
`;

interface Props {
  topic: StatsTopic;
  galleryId?: string;
  globalScope?: boolean;
  filters: FiltersT;
  setFilters: (filters: FiltersT) => void;
  theme: ActiveTheme;
  lang: string;
  countryData: CountryData;
}

const Topic = ({
  topic,
  galleryId,
  globalScope = false,
  filters,
  setFilters,
  theme,
  lang,
  countryData,
}: Props): React.ReactElement => {
  return (
    <Root key={topic.key} data-type="topic" data-key={topic.key}>
      <Title>{topic.title}</Title>
      <Categories>
        {topic.categories.map((category) => (
          <Category
            key={`${category.key}:${topic.key}`}
            topic={topic}
            category={category}
            galleryId={galleryId}
            globalScope={globalScope}
            filters={filters}
            setFilters={setFilters}
            theme={theme}
            lang={lang}
            countryData={countryData}
          />
        ))}
      </Categories>
    </Root>
  );
};
export default Topic;
