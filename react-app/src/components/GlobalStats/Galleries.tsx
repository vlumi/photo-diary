import React from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import styled from "@emotion/styled";
import { keepPreviousData, useQuery } from "@tanstack/react-query";

import format from "../../lib/format";
import filter from "../../lib/filter";
import statsService from "../../services/stats";
import { useFiltersStore } from "../../stores";

interface Gallery {
  id: string;
  [key: string]: unknown;
}

interface Props {
  galleries: Gallery[];
  lang: string;
}

const Root = styled.section`
  width: 100%;
  display: grid;
  grid-template-columns: auto 1fr;
  align-items: stretch;
  margin-bottom: 8px;
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
const Body = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(330px, 1fr));
  gap: 2px;
  align-content: start;
  min-width: 0;
`;
const Tile = styled.div`
  margin: 0 0 2px;
  min-width: 0;
`;
const TileTitle = styled.h3`
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
const Table = styled.table`
  width: 100%;
  text-align: left;
  margin: 0;
  padding: 0;
  font-size: small;
  border-spacing: 0;
  border-collapse: collapse;
`;
const Row = styled.tr`
  cursor: pointer;
  &:hover {
    color: var(--header-color);
    background-color: var(--header-background);
  }
`;
const RowOrphan = styled(Row)`
  color: var(--inactive-color);
  font-style: italic;
`;
const Cell = styled("td", {
  shouldForwardProp: (prop) => prop !== "$align",
})<{ $align: "left" | "right" }>`
  padding: 0 2px;
  vertical-align: top;
  text-align: ${(props) => props.$align};
  overflow: hidden;
  overflow-wrap: anywhere;
`;
const RankCell = styled("th", {
  shouldForwardProp: (prop) => prop !== "$align",
})<{ $align: "left" | "right" }>`
  font-weight: bold;
  padding: 0 2px;
  vertical-align: top;
  text-align: ${(props) => props.$align};
  width: 1em;
`;

const ORPHAN_KEY = ":orphan";

// Reads filter-aware per-gallery counts from the global stats
// response (#446). Same queryKey as the sibling <Stats> component's
// internal fetch, so TanStack dedupes — one network call for
// both sections.
const Galleries = ({
  galleries,
  lang,
}: Props): React.ReactElement | null => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const formatNumber = format.number(lang);
  const filters = useFiltersStore((s) => s.filters);
  const serverFilters = React.useMemo(
    () => filter.toServerFilters(filters),
    [filters]
  );
  const { data: stats } = useQuery({
    queryKey: ["stats", "__global__", serverFilters, lang],
    queryFn: () => statsService.getGlobalStats(serverFilters, lang),
    placeholderData: keepPreviousData,
  });

  const titleById = React.useMemo(() => {
    const m = new Map<string, string>();
    for (const g of galleries) {
      const title = typeof g.title === "string" ? g.title : g.id;
      m.set(g.id, title);
    }
    return m;
  }, [galleries]);

  const { rows, orphanCount, total } = React.useMemo(() => {
    const byGallery = stats?.byGallery ?? {};
    const orphans = byGallery[ORPHAN_KEY] ?? 0;
    const collator = new Intl.Collator(lang, { sensitivity: "base" });
    const ranked = Object.entries(byGallery)
      .filter(([id]) => id !== ORPHAN_KEY)
      .map(([id, count]) => ({
        id,
        count,
        title: titleById.get(id) ?? id,
      }))
      .sort((a, b) => b.count - a.count || collator.compare(a.title, b.title));
    return { rows: ranked, orphanCount: orphans, total: stats?.total ?? 0 };
  }, [stats, titleById, lang]);

  if (!stats || (rows.length === 0 && orphanCount === 0)) {
    return null;
  }

  return (
    <Root>
      <Title>{t("stats-topic-galleries")}</Title>
      <Body>
        <Tile>
          <TileTitle>{t("stats-category-gallery")}</TileTitle>
          <Table>
            <tbody>
              {rows.map((row, i) => (
                <Row
                  key={row.id}
                  onClick={() => navigate(`/s/${encodeURIComponent(row.id)}`)}
                >
                  <RankCell $align="right">
                    {formatNumber.default(i + 1)}
                  </RankCell>
                  <Cell $align="left">{row.title}</Cell>
                  <Cell $align="right">{formatNumber.default(row.count)}</Cell>
                  <Cell $align="right">
                    {`${formatNumber.oneDecimal(
                      format.share(row.count, total)
                    )}%`}
                  </Cell>
                </Row>
              ))}
              {orphanCount > 0 ? (
                <RowOrphan>
                  <RankCell $align="right">{""}</RankCell>
                  <Cell $align="left">{t("stats-galleries-orphans")}</Cell>
                  <Cell $align="right">
                    {formatNumber.default(orphanCount)}
                  </Cell>
                  <Cell $align="right">
                    {`${formatNumber.oneDecimal(
                      format.share(orphanCount, total)
                    )}%`}
                  </Cell>
                </RowOrphan>
              ) : null}
            </tbody>
          </Table>
        </Tile>
      </Body>
    </Root>
  );
};

export default Galleries;
