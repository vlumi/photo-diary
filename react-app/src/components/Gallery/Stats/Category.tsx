import React from "react";
import styled from "@emotion/styled";
import { useTranslation } from "react-i18next";
import { BsArrowsFullscreen, BsGeoAlt } from "react-icons/bs";

import Summary from "./Summary";
import Charts from "./Charts";
import Table from "./Table";
import TableModal from "./TableModal";
import SummaryModal from "./SummaryModal";
import MapModal from "../../MapModal";

import filter, { type Filters as FiltersT } from "../../../lib/filter";
import stats, { type StatsTopic, type StatsCategory } from "../../../lib/stats";

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
const LocationBody = styled.div`
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 8px;
  padding: 12px 6px;
  background: var(--tile-background);
  border: 1px solid var(--inactive-color);
  border-radius: 6px;
  margin: 4px 0;
`;
const LocationCount = styled.div`
  text-align: center;
  font-size: 0.9em;
  color: var(--primary-color);
`;
// Pair of click-to-filter chips for the mixed-completeness case. Same
// visual idiom as the table's selectable rows (hover/selected swap
// header-color and header-background). The two chips together also
// communicate the geotagged-vs-not ratio at a glance.
const ChipRow = styled.div`
  display: flex;
  gap: 6px;
  justify-content: center;
  flex-wrap: wrap;
`;
const Chip = styled.button<{ $selected?: boolean }>`
  border: 1px solid var(--inactive-color);
  border-radius: 4px;
  padding: 4px 10px;
  font-size: 0.85em;
  cursor: pointer;
  background: ${({ $selected }) =>
    $selected ? "var(--header-background)" : "var(--primary-background)"};
  color: ${({ $selected }) =>
    $selected ? "var(--header-color)" : "var(--primary-color)"};
  &:hover {
    background: var(--header-background);
    color: var(--header-color);
  }
`;
const LocationButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  align-self: center;
  border: 1px solid var(--inactive-color);
  background: var(--primary-background);
  color: var(--primary-color);
  border-radius: 4px;
  padding: 6px 14px;
  font-size: 0.85em;
  cursor: pointer;
  &:hover {
    border-color: var(--primary-color);
  }
`;

// Location card body: "All photos geotagged" / "No photos geotagged"
// when uniform; two click-to-filter chips otherwise. Clicking a chip
// applies a `general / geotagged / yes|no` filter; clicking the same
// chip again removes it (yargs-like toggle, matching how the Table
// rows toggle filters via `applyNewFilter`).
const renderLocationCounts = (
  category: StatsCategory,
  filters: FiltersT,
  setFilters: (filters: FiltersT) => void,
  t: ReturnType<typeof useTranslation>["t"]
): React.ReactNode => {
  const geo = category.geotaggedCount ?? 0;
  const total = category.totalCount ?? 0;
  const notGeo = Math.max(0, total - geo);

  if (total === 0) return null;
  if (notGeo === 0) {
    return (
      <LocationCount>
        {t("stats-location-all-geotagged", { count: total })}
      </LocationCount>
    );
  }
  if (geo === 0) {
    return (
      <LocationCount>
        {t("stats-location-none-geotagged", { count: total })}
      </LocationCount>
    );
  }

  const toggleFilter = (key: "yes" | "no") =>
    setFilters(
      filter.applyNewFilter(
        filters,
        "general",
        "geotagged",
        key,
        stats.UNKNOWN
      )
    );
  const isSelected = (key: "yes" | "no"): boolean =>
    Boolean(filters.general?.geotagged?.[key]);

  return (
    <ChipRow>
      <Chip
        type="button"
        $selected={isSelected("yes")}
        onClick={() => toggleFilter("yes")}
      >
        {t("stats-location-count-geotagged", { count: geo })}
      </Chip>
      <Chip
        type="button"
        $selected={isSelected("no")}
        onClick={() => toggleFilter("no")}
      >
        {t("stats-location-count-not-geotagged", { count: notGeo })}
      </Chip>
    </ChipRow>
  );
};

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
  const { t } = useTranslation();
  const [modalOpen, setModalOpen] = React.useState(false);
  // Three flavours of modal:
  // - Chart + table categories use TableModal (full distribution).
  // - The summary category uses SummaryModal (period / peaks / variety
  //   / most-used overview).
  // - The location category uses MapModal (the full-size map).
  // Either way the category title is the click affordance.
  const hasTable = !!category.table;
  const hasSummaryExtras = !!category.summaryExtras;
  const isLocation = category.kind === "location";
  const hasExpandableContent = hasTable || hasSummaryExtras || isLocation;
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
      {isLocation ? (
        <LocationBody>
          {renderLocationCounts(category, filters, setFilters, t)}
          <LocationButton type="button" onClick={openModal}>
            <BsGeoAlt aria-hidden="true" />
            {t("stats-location-see-on-map")}
          </LocationButton>
        </LocationBody>
      ) : (
        <>
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
        </>
      )}
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
      {modalOpen && isLocation && (
        <MapModal
          title={category.title}
          photos={category.photos ?? []}
          onClose={() => setModalOpen(false)}
        />
      )}
    </Root>
  );
};
export default Category;
