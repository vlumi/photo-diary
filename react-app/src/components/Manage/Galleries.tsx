import React from "react";
import { useNavigate } from "react-router-dom";
import styled from "@emotion/styled";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { BsImages, BsPlus, BsShieldLock } from "react-icons/bs";

import GalleryTypeIcon from "./GalleryTypeIcon";
import config from "../../lib/config";
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
// Horizontal scroll only when the columns can't fit (mobile /
// narrow viewports). On wide screens it's a no-op — the table
// already fills 100% inside the Root's 1200px max-width.
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
// 32px square cover thumbnail in the leading cell. `object-fit:
// cover` keeps tall / wide icons centered without distortion;
// the placeholder Box keeps row heights consistent when an
// icon's missing.
const IconCell = styled.td`
  padding: 8px 0 8px 12px;
  width: 32px;
`;
const IconImg = styled.img`
  width: 32px;
  height: 32px;
  object-fit: cover;
  border-radius: 4px;
  border: 1px solid var(--inactive-color);
  background: var(--header-background);
  display: block;
`;
const IconPlaceholder = styled.div`
  width: 32px;
  height: 32px;
  border-radius: 4px;
  border: 1px dashed var(--inactive-color);
`;
const IdCell = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
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
  icon?: string;
  epoch?: string;
  epochType?: string;
  type?: "real" | "hybrid" | "saved_filter";
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
      <TitleRow>
        <Title>{t("manage-page-galleries-title")}</Title>
        <CreateButton
          type="button"
          onClick={() => navigate("/m/galleries/new")}
        >
          <BsPlus aria-hidden />
          {t("manage-galleries-create")}
        </CreateButton>
      </TitleRow>
      {isLoading ? (
        <Notice>{t("loading")}</Notice>
      ) : isError ? (
        <Notice>{t("manage-galleries-load-error")}</Notice>
      ) : rows.length === 0 ? (
        <Notice>{t("manage-galleries-empty")}</Notice>
      ) : (
        <TableScroll>
          <Table>
            <thead>
            <tr>
              <Th></Th>
              <Th>{t("manage-galleries-col-id")}</Th>
              <Th>{t("manage-galleries-col-title")}</Th>
              <Th>{t("manage-galleries-col-epoch")}</Th>
              <Th>{t("manage-galleries-col-hostname")}</Th>
              <Th>{t("manage-galleries-col-theme")}</Th>
              <Th></Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((g) => (
              <Row key={g.id} onClick={() => navigate(`/m/g/${g.id}`)}>
                <IconCell>
                  {g.icon ? (
                    <IconImg
                      src={`${config.PHOTO_ROOT_URL}${g.icon}`}
                      alt=""
                      loading="lazy"
                    />
                  ) : (
                    <IconPlaceholder aria-hidden />
                  )}
                </IconCell>
                <Td>
                  <IdCell>
                    <GalleryTypeIcon type={g.type} />
                    <Mono>{g.id}</Mono>
                  </IdCell>
                </Td>
                <Td>{g.title || ""}</Td>
                <Td>{g.epoch ? g.epoch.substring(0, 10) : ""}</Td>
                <Td>
                  <Mono>{g.hostname || ""}</Mono>
                </Td>
                <Td>{g.theme || ""}</Td>
                <Td>
                  <Actions>
                    <ActionButton
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/m/photos?gallery=${g.id}`);
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
        </TableScroll>
      )}
    </Root>
  );
};

export default Galleries;
