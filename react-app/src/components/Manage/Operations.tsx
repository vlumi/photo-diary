import React from "react";
import styled from "@emotion/styled";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";

import operationsService from "../../services/operations";
import { useUserStore } from "../../stores";

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
const SectionTitle = styled.h3`
  margin: 24px 0 8px;
  font-size: 0.95em;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--inactive-color);
`;
const PendingTiles = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 10px;
`;
const PendingTile = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 10px 12px;
  background: var(--primary-background);
  color: var(--primary-color);
  border: 1px solid var(--inactive-color);
  border-radius: 4px;
`;
const PendingCount = styled.span`
  font-size: 1.5em;
  font-weight: bold;
  line-height: 1;
`;
const PendingLabel = styled.span`
  font-size: 0.8em;
  opacity: 0.85;
`;
const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 0.85em;
`;
const Th = styled.th`
  text-align: left;
  padding: 6px 8px;
  border-bottom: 1px solid var(--inactive-color);
  color: var(--inactive-color);
  font-weight: 600;
  white-space: nowrap;
`;
const Td = styled.td`
  padding: 6px 8px;
  border-bottom: 1px solid var(--inactive-color);
  vertical-align: top;
  word-break: break-word;
`;
const StatusCell = styled(Td)<{ $status: "success" | "failure" | "skipped" }>`
  font-weight: 600;
  white-space: nowrap;
  color: ${({ $status }) =>
    $status === "failure"
      ? "var(--alert-color, #d33)"
      : $status === "skipped"
        ? "var(--inactive-color)"
        : "inherit"};
`;
const Notice = styled.p`
  color: var(--inactive-color);
  font-style: italic;
  margin: 0;
`;

type Event = {
  id: number;
  createdAt: string;
  photoId: string | null;
  action: string;
  status: "success" | "failure" | "skipped";
  detail: string | null;
};

const formatTimestamp = (iso: string): string => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
};

const EventTable = ({ events }: { events: Event[] }): React.ReactElement => {
  const { t } = useTranslation();
  if (events.length === 0) {
    return <Notice>{t("manage-operations-empty")}</Notice>;
  }
  return (
    <Table>
      <thead>
        <tr>
          <Th>{t("manage-operations-col-time")}</Th>
          <Th>{t("manage-operations-col-action")}</Th>
          <Th>{t("manage-operations-col-status")}</Th>
          <Th>{t("manage-operations-col-photo")}</Th>
          <Th>{t("manage-operations-col-detail")}</Th>
        </tr>
      </thead>
      <tbody>
        {events.map((e) => (
          <tr key={e.id}>
            <Td>{formatTimestamp(e.createdAt)}</Td>
            <Td>{e.action}</Td>
            <StatusCell $status={e.status}>{e.status}</StatusCell>
            <Td>{e.photoId ?? ""}</Td>
            <Td>{e.detail ?? ""}</Td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
};

const Operations = (): React.ReactElement => {
  const { t } = useTranslation();
  const user = useUserStore((s) => s.user);
  const isAdmin = !!user?.isAdmin();

  const opsQuery = useQuery({
    queryKey: ["operations", user?.id ?? null],
    queryFn: () => operationsService.get(),
    enabled: isAdmin,
    refetchInterval: 15_000,
  });

  if (!isAdmin) {
    return (
      <Root>
        <Notice>{t("manage-not-admin")}</Notice>
      </Root>
    );
  }
  if (opsQuery.isLoading) {
    return (
      <Root>
        <Title>{t("manage-page-operations-title")}</Title>
        <Notice>{t("loading")}</Notice>
      </Root>
    );
  }
  if (opsQuery.isError || !opsQuery.data) {
    return (
      <Root>
        <Title>{t("manage-page-operations-title")}</Title>
        <Notice>{t("manage-operations-load-error")}</Notice>
      </Root>
    );
  }

  const { recent, failures, pending } = opsQuery.data;

  return (
    <Root>
      <Title>{t("manage-page-operations-title")}</Title>

      <SectionTitle>{t("manage-operations-pending")}</SectionTitle>
      <PendingTiles>
        <PendingTile>
          <PendingCount>{pending.intake}</PendingCount>
          <PendingLabel>{t("manage-operations-pending-intake")}</PendingLabel>
        </PendingTile>
        <PendingTile>
          <PendingCount>{pending.geocode}</PendingCount>
          <PendingLabel>{t("manage-operations-pending-geocode")}</PendingLabel>
        </PendingTile>
      </PendingTiles>

      {failures.length > 0 && (
        <>
          <SectionTitle>{t("manage-operations-failures")}</SectionTitle>
          <EventTable events={failures} />
        </>
      )}

      <SectionTitle>{t("manage-operations-recent")}</SectionTitle>
      <EventTable events={recent} />
      <Notice>{t("manage-operations-retention")}</Notice>
    </Root>
  );
};

export default Operations;
