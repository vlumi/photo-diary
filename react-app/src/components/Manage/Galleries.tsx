import React from "react";
import { useNavigate } from "react-router-dom";
import styled from "@emotion/styled";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";

import galleriesService from "../../services/galleries";
import { useUserStore } from "../../stores";

const Root = styled.div`
  padding: 24px 16px;
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
const Th = styled.th`
  text-align: left;
  padding: 8px 12px;
  border-bottom: 1px solid var(--inactive-color);
  font-weight: bold;
  color: var(--inactive-color);
  text-transform: uppercase;
  font-size: 0.85em;
  letter-spacing: 0.05em;
`;
const Td = styled.td`
  padding: 8px 12px;
  border-bottom: 1px solid var(--inactive-color);
  vertical-align: top;
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
              </Row>
            ))}
          </tbody>
        </Table>
      )}
    </Root>
  );
};

export default Galleries;
