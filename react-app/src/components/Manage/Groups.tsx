import React from "react";
import { useNavigate } from "react-router-dom";
import styled from "@emotion/styled";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { BsPlus } from "react-icons/bs";

import groupsService, { type GroupRow } from "../../services/groups";
import { useUserStore } from "../../stores";

const Root = styled.div`
  padding: 24px 16px;
  max-width: 1200px;
  margin: 0 auto;
  text-align: left;
`;
const TitleRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  margin: 0 0 16px;
`;
const Title = styled.h2`
  margin: 0;
  font-size: 1.2em;
`;
const CreateButton = styled.button`
  font: inherit;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  background: var(--header-background);
  color: var(--header-color);
  border: 1px solid var(--header-background);
  border-radius: 4px;
  font-size: 0.85em;
  cursor: pointer;
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
  vertical-align: middle;
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

const Groups = (): React.ReactElement => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useUserStore((s) => s.user);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["manage-groups", user?.id ?? null],
    queryFn: () => groupsService.getAll(),
    enabled: !!user?.isAdmin(),
  });

  const rows = React.useMemo<GroupRow[]>(() => {
    if (!Array.isArray(data)) return [];
    return data.slice().sort((a, b) => a.id.localeCompare(b.id));
  }, [data]);

  return (
    <Root>
      <TitleRow>
        <Title>{t("manage-page-groups-title")}</Title>
        <CreateButton
          type="button"
          onClick={() => navigate("/m/groups/new")}
        >
          <BsPlus aria-hidden />
          {t("manage-groups-create")}
        </CreateButton>
      </TitleRow>
      {isLoading ? (
        <Notice>{t("loading")}</Notice>
      ) : isError ? (
        <Notice>{t("manage-groups-load-error")}</Notice>
      ) : rows.length === 0 ? (
        <Notice>{t("manage-groups-empty")}</Notice>
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>{t("manage-groups-col-id")}</Th>
              <Th>{t("manage-groups-col-title")}</Th>
              <Th>{t("manage-groups-col-description")}</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((g) => (
              <Row key={g.id} onClick={() => navigate(`/m/groups/${g.id}`)}>
                <Td>
                  <Mono>{g.id}</Mono>
                </Td>
                <Td>{g.title || ""}</Td>
                <Td>{g.description || ""}</Td>
              </Row>
            ))}
          </tbody>
        </Table>
      )}
    </Root>
  );
};

export default Groups;
