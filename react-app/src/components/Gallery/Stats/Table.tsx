import React from "react";
import { useTranslation } from "react-i18next";
import styled from "@emotion/styled";

import color from "../../../lib/color";
import stats from "../../../lib/stats";
import filter, { type Filters as FiltersT } from "../../../lib/filter";
import type {
  SortMode,
  StatsTopic,
  StatsCategory,
  TableRow,
  TableColumn,
} from "../../../lib/stats";

type ActiveTheme = { get: (name: string) => string };

const Root = styled.table`
  width: 100%;
  text-align: left;
  margin: 0;
  padding: 0;
  font-size: small;
  border-spacing: 0;
  border-collapse: collapse;
`;
const Block = styled.tbody``;
const HeaderRow = styled.tr``;
const Row = styled.tr`
  cursor: pointer;
  &:hover {
    color: var(--header-color);
    background-color: var(--header-background);
  }
`;
const RowSelected = styled(Row)`
  color: var(--header-color);
  background-color: var(--header-background);
`;
const RowHeat = styled(Row, {
  shouldForwardProp: (prop) => prop !== "$heat",
})<{ $heat: string }>`
  background-color: ${(props) => props.$heat};
`;
const RowNone = styled(Row, {
  shouldForwardProp: (prop) => prop !== "$heat",
})<{ $heat: string }>`
  color: var(--inactive-color);
  background-color: ${(props) => props.$heat};
`;
const Header = styled("th", {
  shouldForwardProp: (prop) => prop !== "$align",
})<{ $align: string }>`
  font-weight: bold;
  padding: 0 2px;
  vertical-align: top;
  text-align: ${(props) => props.$align};
  overflow: hidden;
`;
const RowHeader = styled(Header)`
  text-align: right;
  width: 1em;
`;
const Column = styled("td", {
  shouldForwardProp: (prop) => prop !== "$align",
})<{ $align: string }>`
  padding: 0 2px;
  vertical-align: top;
  text-align: ${(props) => props.$align};
  overflow: hidden;
  /* Allow long category labels (e.g. camera-lens names) to wrap rather
     than forcing the table wider than its container. */
  overflow-wrap: anywhere;
`;
const ExpandRow = styled.tr`
  cursor: pointer;
  color: var(--inactive-color);
  font-style: italic;
  &:hover {
    color: var(--header-color);
    background-color: var(--header-background);
  }
`;
const ExpandCell = styled.td`
  padding: 2px;
  text-align: center;
`;

interface HeatColorCache {
  from: string | undefined;
  to: string | undefined;
  values: string[];
}
const cachedHeatColors: HeatColorCache = {
  from: undefined,
  to: undefined,
  values: [],
};
const getHeatColors = (theme: ActiveTheme): string[] => {
  const gradientFrom = theme.get("primary-background");
  const gradientTo = theme.get("inactive-color");
  if (
    cachedHeatColors.from === gradientFrom &&
    cachedHeatColors.to === gradientTo
  ) {
    return cachedHeatColors.values;
  }
  cachedHeatColors.from = gradientFrom;
  cachedHeatColors.to = gradientTo;
  cachedHeatColors.values = color.colorGradient(gradientFrom, gradientTo, 10);
  return cachedHeatColors.values;
};

interface Props {
  topic: StatsTopic;
  category: StatsCategory;
  filters: FiltersT;
  setFilters: (filters: FiltersT) => void;
  theme: ActiveTheme;
  // Optional cap on the number of rows shown inline. When the actual row
  // count exceeds the cap, a trailing "+ N more…" row is rendered that
  // fires `onExpand` (typically to open a modal with the full table).
  // Omitted from the modal itself so it shows every row.
  limit?: number;
  onExpand?: () => void;
  // Modal-only override; inline view leaves this unset and the natural
  // sort stands (with the cap re-sorting as a separate concern below).
  sortMode?: SortMode;
}

const Table = ({
  topic,
  category,
  filters,
  setFilters,
  theme,
  limit,
  onExpand,
  sortMode = "value",
}: Props): React.ReactElement => {
  const { t } = useTranslation();

  const handleClick = (event: React.MouseEvent) => {
    const target = event.target as HTMLElement;
    const topicElement = target.closest("[data-type=topic]");
    const categoryElement = target.closest("[data-type=category]");
    const keyElement = target.closest("tr");

    if (!keyElement || !categoryElement) {
      return;
    }
    const topic = topicElement?.getAttribute("data-key");
    const category = categoryElement.getAttribute("data-key");
    const key = keyElement.getAttribute("data-key");

    if (!topic || !category || !key) {
      return;
    }
    const newFilters = filter.applyNewFilter(
      filters,
      topic,
      category,
      key,
      stats.UNKNOWN
    );
    setFilters(newFilters);
  };

  if (!category.table || !category.tableColumns) {
    return <></>;
  }
  const tableColumns = category.tableColumns;
  const renderColumns = (values: TableRow, i: number) => {
    return tableColumns.map((column: TableColumn) =>
      column.header ? (
        <RowHeader
          key={`${topic.key}:${category.key}:${i}${column.title}`}
          $align={column.align}
        >
          {values[column.title] as React.ReactNode}
        </RowHeader>
      ) : (
        <Column
          key={`${topic.key}:${category.key}:${i}${column.title}`}
          $align={column.align}
        >
          {values[column.title] as React.ReactNode}
        </Column>
      )
    );
  };
  const getScoreColor = (score: number): string => {
    const heatColors = getHeatColors(theme);
    if (score < -1) return heatColors[0];
    if (score < -0.75) return heatColors[1];
    if (score < -0.5) return heatColors[2];
    if (score < -0.25) return heatColors[3];
    if (score < -0.125) return heatColors[4];
    if (score < 0.125) return heatColors[5];
    if (score < 0.25) return heatColors[6];
    if (score < 0.5) return heatColors[7];
    if (score < 0.75) return heatColors[8];
    return heatColors[9];
  };
  const renderRows = (
    topic: string,
    category: string,
    table: TableRow[]
  ) => {
    return table.map((value, i) => {
      const valueKey = stats.decodeTableRowKey(value.key as string | undefined);
      const key = `${topic}:${category}:${valueKey}`;
      if (
        valueKey !== undefined &&
        topic in filters &&
        category in filters[topic] &&
        valueKey in filters[topic][category]
      ) {
        return (
          <RowSelected key={key} onClick={handleClick} data-key={valueKey}>
            {renderColumns(value, i)}
          </RowSelected>
        );
      }

      if (value.count === "0") {
        return (
          <RowNone
            key={key}
            onClick={handleClick}
            data-key={valueKey}
            $heat={getScoreColor(Number(value.standardScore))}
          >
            {renderColumns(value, i)}
          </RowNone>
        );
      }
      return (
        <RowHeat
          key={key}
          onClick={handleClick}
          data-key={valueKey}
          $heat={getScoreColor(Number(value.standardScore))}
        >
          {renderColumns(value, i)}
        </RowHeat>
      );
    });
  };

  const fullTable = category.table;
  const isInline = limit !== undefined;
  const shouldCap = isInline && fullTable.length > limit;
  // Inline view defaults to top-by-count so the 10-row preview reads
  // as "the headlines" for categories with no inherent ordering (gear,
  // people, country, etc.). Time categories (year-month / year /
  // month / weekday / hour) opt out via `naturalInlineOrder` — their
  // chart axis is the value, and a by-count list would visually
  // contradict the chart sitting above it. The modal still defaults
  // to "By count" but offers "By value" as the alternate reading.
  // `valueSortByLabel` (gear, people-or-place) → alpha sort on the
  // display column (which lives at `row[category.key]`). Otherwise →
  // the order from collectTopics (exposure numeric, time
  // chronological).
  const forceCount =
    sortMode === "count" || (isInline && !category.naturalInlineOrder);
  const sortedTable = (() => {
    if (forceCount) {
      return [...fullTable].sort(
        (a, b) => Number(b._count ?? 0) - Number(a._count ?? 0)
      );
    }
    if (category.valueSortByLabel) {
      // Country renders the display column as `<><FlagIcon/> name</>`,
      // so its sortable string lives in the optional `_label` field.
      // String-column categories (author / camera / lens / …) sort
      // via `row[category.key]` directly.
      const labelCol = category.key;
      const labelOf = (row: TableRow): string =>
        typeof row._label === "string"
          ? row._label
          : String(row[labelCol] ?? "");
      return [...fullTable].sort((a, b) =>
        labelOf(a).localeCompare(labelOf(b))
      );
    }
    return fullTable;
  })();
  const visibleTable = shouldCap ? sortedTable.slice(0, limit) : sortedTable;
  const hiddenCount = shouldCap ? fullTable.length - limit : 0;

  return (
    <Root>
      <Block>
        <HeaderRow>
          {tableColumns.map((column: TableColumn) => (
            <Header
              key={`${topic.key}:header:${column.title}`}
              $align={column.align}
            >
              {t(`stats-col-${column.title}`)}
            </Header>
          ))}
        </HeaderRow>
        {renderRows(topic.key, category.key, visibleTable)}
        {hiddenCount > 0 && onExpand && (
          <ExpandRow onClick={onExpand}>
            <ExpandCell colSpan={tableColumns.length}>
              {t("stats-more", { count: hiddenCount })}
            </ExpandCell>
          </ExpandRow>
        )}
      </Block>
    </Root>
  );
};
export default Table;
