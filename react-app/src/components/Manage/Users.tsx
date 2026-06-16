import React from "react";
import { useNavigate } from "react-router-dom";
import styled from "@emotion/styled";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { BsPlus } from "react-icons/bs";

import usersService, { type UserRow } from "../../services/users";
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
const TableScroll = styled.div`
  overflow-x: auto;
  width: 100%;
`;
const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9em;
`;
// last-of-type width: 1% + nowrap shrinks the column to fit.
const Th = styled.th`
  text-align: left;
  padding: 8px 12px;
  border-bottom: 1px solid var(--inactive-color);
  font-weight: bold;
  color: var(--inactive-color);
  text-transform: uppercase;
  font-size: 0.85em;
  letter-spacing: 0.05em;
  &:last-of-type {
    width: 1%;
    white-space: nowrap;
  }
`;
const Td = styled.td`
  padding: 8px 12px;
  border-bottom: 1px solid var(--inactive-color);
  vertical-align: middle;
  &:last-of-type {
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
const AdminBadge = styled.span`
  display: inline-block;
  padding: 2px 8px;
  border-radius: 10px;
  background: var(--header-background);
  color: var(--header-color);
  font-size: 0.75em;
  font-weight: bold;
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;
const GuestBadge = styled.span`
  display: inline-block;
  padding: 2px 8px;
  border-radius: 10px;
  background: transparent;
  color: var(--inactive-color);
  border: 1px solid var(--inactive-color);
  font-size: 0.75em;
  font-weight: bold;
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

const Users = (): React.ReactElement => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useUserStore((s) => s.user);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["manage-users", user?.id ?? null],
    queryFn: () => usersService.getAll(),
    enabled: !!user?.isAdmin(),
  });

  const rows = React.useMemo<UserRow[]>(() => {
    if (!Array.isArray(data)) return [];
    return data.slice().sort((a, b) => a.id.localeCompare(b.id));
  }, [data]);

  return (
    <Root>
      <TitleRow>
        <Title>{t("manage-page-users-title")}</Title>
        <CreateButton
          type="button"
          onClick={() => navigate("/m/users/new")}
        >
          <BsPlus aria-hidden />
          {t("manage-users-create")}
        </CreateButton>
      </TitleRow>
      {isLoading ? (
        <Notice>{t("loading")}</Notice>
      ) : isError ? (
        <Notice>{t("manage-users-load-error")}</Notice>
      ) : rows.length === 0 ? (
        <Notice>{t("manage-users-empty")}</Notice>
      ) : (
        <TableScroll>
          <Table>
          <thead>
            <tr>
              <Th>{t("manage-users-col-id")}</Th>
              <Th>{t("manage-users-col-name")}</Th>
              <Th>{t("manage-users-col-role")}</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((u) => (
              <Row
                key={u.id}
                onClick={() =>
                  navigate(`/m/users/${u.id}`, {
                    state: { skipScrollRestore: true },
                  })
                }
              >
                <Td>
                  <Mono>{u.id}</Mono>
                </Td>
                <Td>{u.name || ""}</Td>
                <Td>
                  {u.id === ":guest" ? (
                    <GuestBadge>{t("manage-users-role-guest")}</GuestBadge>
                  ) : u.isAdmin ? (
                    <AdminBadge>{t("manage-users-role-admin")}</AdminBadge>
                  ) : null}
                </Td>
              </Row>
            ))}
          </tbody>
          </Table>
        </TableScroll>
      )}
    </Root>
  );
};

export default Users;
