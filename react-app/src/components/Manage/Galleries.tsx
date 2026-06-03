import React from "react";
import { useNavigate } from "react-router-dom";
import styled from "@emotion/styled";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { BsImages, BsShieldLock } from "react-icons/bs";

import galleriesService from "../../services/galleries";
import { useUserStore } from "../../stores";

// body has text-align: center globally; cancel it here so column
// content (and the heading above the table) lines up with the
// column header from the left. margin: 0 auto centres the bounded
// table on ultrawide screens instead of pinning it to the left.
const Root = styled.div`
  padding: 24px 16px;
  max-width: 1200px;
  margin: 0 auto;
  text-align: left;
`;
const Title = styled.h2`
  margin: 0 0 16px;
  font-size: 1.2em;
`;
const Notice = styled.p`
  color: var(--inactive-color);
  font-style: italic;
  margin: 0;
`;
const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9em;
`;
// First column's inner padding would push its content right of the
// Title (which sits at Root's padding edge); zeroing the leading
// pad on first-of-type cells lines the column up with the heading.
// width: 1% + white-space: nowrap on the trailing actions column
// is the classic "shrink to fit content" idiom for auto-layout
// tables. Without it the actions cell soaks up the slack space the
// browser distributes across auto-sized columns, leaving the
// buttons floating at the cell's left edge with empty space to
// their right.
const Th = styled.th`
  text-align: left;
  padding: 8px 12px;
  border-bottom: 1px solid var(--inactive-color);
  font-weight: bold;
  color: var(--inactive-color);
  text-transform: uppercase;
  font-size: 0.85em;
  letter-spacing: 0.05em;
  &:first-of-type {
    padding-left: 0;
  }
  &:last-of-type {
    padding-right: 0;
    width: 1%;
    white-space: nowrap;
  }
`;
const Td = styled.td`
  padding: 8px 12px;
  border-bottom: 1px solid var(--inactive-color);
  vertical-align: middle;
  &:first-of-type {
    padding-left: 0;
  }
  &:last-of-type {
    padding-right: 0;
    width: 1%;
    white-space: nowrap;
  }
`;
const Row = styled.tr`
  cursor: pointer;
  &:hover td {
    background: var(--header-background);
    color: var(--header-color);
  }
`;
const Mono = styled.span`
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.9em;
`;
const Actions = styled.div`
  display: inline-flex;
  gap: 6px;
  justify-content: flex-end;
`;
const ActionButton = styled.a`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border: 1px solid var(--inactive-color);
  border-radius: 4px;
  color: var(--primary-color);
  background: var(--primary-background);
  text-decoration: none;
  font-size: 0.85em;
  cursor: pointer;
  white-space: nowrap;
  &:hover {
    background: var(--header-background);
    color: var(--header-color);
  }
`;

interface GalleryRow {
  id: string;
  title?: string;
  hostname?: string;
  theme?: string;
}

const Galleries = (): React.ReactElement => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useUserStore((s) => s.user);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["manage-galleries", user?.id ?? null],
    queryFn: () => galleriesService.getAll(),
    enabled: !!user?.isAdmin(),
  });

  const rows = React.useMemo<GalleryRow[]>(() => {
    if (!Array.isArray(data)) return [];
    return (data as GalleryRow[]).slice().sort((a, b) =>
      a.id.localeCompare(b.id)
    );
  }, [data]);

  return (
    <Root>
      <Title>{t("manage-page-galleries-title")}</Title>
      {isLoading ? (
        <Notice>{t("loading")}</Notice>
      ) : isError ? (
        <Notice>{t("manage-galleries-load-error")}</Notice>
      ) : rows.length === 0 ? (
        <Notice>{t("manage-galleries-empty")}</Notice>
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>{t("manage-galleries-col-id")}</Th>
              <Th>{t("manage-galleries-col-title")}</Th>
              <Th>{t("manage-galleries-col-hostname")}</Th>
              <Th>{t("manage-galleries-col-theme")}</Th>
              <Th></Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((g) => (
              <Row key={g.id} onClick={() => navigate(`/m/g/${g.id}`)}>
                <Td>
                  <Mono>{g.id}</Mono>
                </Td>
                <Td>{g.title || ""}</Td>
                <Td>
                  <Mono>{g.hostname || ""}</Mono>
                </Td>
                <Td>{g.theme || ""}</Td>
                <Td>
                  <Actions>
                    <ActionButton
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/m/g/${g.id}/photos`);
                      }}
                      role="link"
                      tabIndex={0}
                      title={String(t("manage-gallery-link-photos"))}
                    >
                      <BsImages aria-hidden />
                      {t("manage-gallery-link-photos")}
                    </ActionButton>
                    <ActionButton
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/m/g/${g.id}/access`);
                      }}
                      role="link"
                      tabIndex={0}
                      title={String(t("manage-gallery-link-access"))}
                    >
                      <BsShieldLock aria-hidden />
                      {t("manage-gallery-link-access")}
                    </ActionButton>
                  </Actions>
                </Td>
              </Row>
            ))}
          </tbody>
        </Table>
      )}
    </Root>
  );
};

export default Galleries;
