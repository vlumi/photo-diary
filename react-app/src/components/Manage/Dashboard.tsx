import React from "react";
import { Navigate, useNavigate } from "react-router-dom";
import styled from "@emotion/styled";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import {
  BsCollection,
  BsImages,
  BsPencilSquare,
  BsPeople,
  BsPeopleFill,
  BsShieldLock,
} from "react-icons/bs";
import type { IconType } from "react-icons";

import { useHostScope } from "../../lib/use-host-scope";
import { useUserStore } from "../../stores";
import photosService, { type MissingField } from "../../services/photos";

const Root = styled.div`
  padding: 24px 16px;
  max-width: 960px;
  margin: 0 auto;
  text-align: left;
`;
const Title = styled.h2`
  margin: 0 0 16px;
  font-size: 1.2em;
`;
const Tiles = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 12px;
`;
const Tile = styled.button`
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 16px;
  background: var(--primary-background);
  color: var(--primary-color);
  border: 1px solid var(--inactive-color);
  border-radius: 4px;
  cursor: pointer;
  font: inherit;
  text-align: left;
  &:hover {
    background: var(--header-background);
    color: var(--header-color);
    border-color: var(--header-background);
  }
`;
const TileHeading = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-weight: bold;
  font-size: 1em;
`;
const TileBlurb = styled.div`
  color: inherit;
  opacity: 0.75;
  font-size: 0.85em;
  line-height: 1.4;
`;
const SectionTitle = styled.h3`
  margin: 24px 0 12px;
  font-size: 0.95em;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--inactive-color);
`;
const AuditTiles = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 10px;
`;
const AuditTile = styled.button`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  padding: 10px 12px;
  background: var(--primary-background);
  color: var(--primary-color);
  border: 1px solid var(--inactive-color);
  border-radius: 4px;
  cursor: pointer;
  font: inherit;
  text-align: left;
  &:hover {
    background: var(--header-background);
    color: var(--header-color);
    border-color: var(--header-background);
  }
`;
const AuditCount = styled.span`
  font-size: 1.5em;
  font-weight: bold;
  line-height: 1;
`;
const AuditLabel = styled.span`
  font-size: 0.8em;
  opacity: 0.85;
`;

interface TileSpec {
  path: string;
  Icon: IconType;
  titleKey: string;
  blurbKey: string;
}

const GLOBAL_TILES: TileSpec[] = [
  {
    path: "/m/photos",
    Icon: BsImages,
    titleKey: "manage-page-photos-title",
    blurbKey: "manage-dashboard-tile-photos-blurb",
  },
  {
    path: "/m/galleries",
    Icon: BsCollection,
    titleKey: "manage-page-galleries-title",
    blurbKey: "manage-dashboard-tile-galleries-blurb",
  },
  {
    path: "/m/users",
    Icon: BsPeople,
    titleKey: "manage-page-users-title",
    blurbKey: "manage-dashboard-tile-users-blurb",
  },
  {
    path: "/m/groups",
    Icon: BsPeopleFill,
    titleKey: "manage-page-groups-title",
    blurbKey: "manage-dashboard-tile-groups-blurb",
  },
  {
    path: "/m/access",
    Icon: BsShieldLock,
    titleKey: "manage-page-access-title",
    blurbKey: "manage-dashboard-tile-access-blurb",
  },
];

// Audit-count cards link straight into the photos page with the
// matching filter chip pre-active. The query-string key here has
// to match what Photos.tsx's filterFromSearchParams expects.
interface AuditSpec {
  query: string;
  labelKey: string;
}
const TOPLEVEL_AUDIT_SPECS: AuditSpec[] = [
  { query: "orphan=1", labelKey: "manage-photos-audit-orphan" },
  { query: "duplicates=1", labelKey: "manage-photos-audit-duplicates" },
  {
    query: "countryMismatch=1",
    labelKey: "manage-photos-audit-country-mismatch",
  },
];
const MISSING_FIELDS: ReadonlyArray<{ field: MissingField; labelKey: string }> = [
  { field: "taken", labelKey: "manage-photos-audit-missing-taken" },
  { field: "coords", labelKey: "manage-photos-audit-missing-coords" },
  { field: "place", labelKey: "manage-photos-audit-missing-place" },
  { field: "country", labelKey: "manage-photos-audit-missing-country" },
  { field: "author", labelKey: "manage-photos-audit-missing-author" },
  { field: "title", labelKey: "manage-photos-audit-missing-title" },
  {
    field: "description",
    labelKey: "manage-photos-audit-missing-description",
  },
  {
    field: "state-code",
    labelKey: "manage-photos-audit-missing-state-code",
  },
];

const galleryScopedTiles = (galleryId: string): TileSpec[] => [
  {
    path: `/m/g/${galleryId}`,
    Icon: BsPencilSquare,
    titleKey: "manage-dashboard-tile-gallery-edit",
    blurbKey: "manage-dashboard-tile-gallery-edit-blurb",
  },
  {
    path: `/m/g/${galleryId}/photos`,
    Icon: BsImages,
    titleKey: "manage-page-photos-title",
    blurbKey: "manage-dashboard-tile-photos-blurb",
  },
  {
    path: `/m/g/${galleryId}/access`,
    Icon: BsShieldLock,
    titleKey: "manage-page-access-title",
    blurbKey: "manage-dashboard-tile-access-blurb",
  },
];

const Dashboard = (): React.ReactElement => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isReady, isHostScoped, scopedGalleryIds } = useHostScope();
  const user = useUserStore((s) => s.user);
  const isAdmin = !!user?.isAdmin();
  const auditQuery = useQuery({
    queryKey: ["manage-audit-counts", user?.id ?? null],
    queryFn: () => photosService.getAuditCounts(),
    enabled: isAdmin,
    staleTime: 0,
  });
  // Single-gallery host scope is the common shape (one hostname →
  // one gallery). Drop the operator straight into that gallery's
  // edit page — the manage dashboard has nothing to add on top.
  if (isReady && isHostScoped && scopedGalleryIds.length === 1) {
    return <Navigate to={`/m/g/${scopedGalleryIds[0]}`} replace />;
  }
  const tiles = isHostScoped
    ? scopedGalleryIds.flatMap((id) => galleryScopedTiles(id))
    : GLOBAL_TILES;
  const counts = auditQuery.data;
  const auditCards: Array<{ query: string; label: string; count: number }> = [];
  if (counts) {
    for (const spec of TOPLEVEL_AUDIT_SPECS) {
      const key = spec.query.split("=")[0] as
        | "orphan"
        | "duplicates"
        | "countryMismatch";
      const count = counts[key];
      if (count > 0) {
        auditCards.push({ query: spec.query, label: t(spec.labelKey), count });
      }
    }
    for (const m of MISSING_FIELDS) {
      const count = counts.missing[m.field];
      if (count > 0) {
        auditCards.push({
          query: `missing=${m.field}`,
          label: t(m.labelKey),
          count,
        });
      }
    }
  }
  return (
    <Root>
      <Title>{t("manage-page-dashboard-title")}</Title>
      {auditCards.length > 0 && (
        <>
          <SectionTitle>{t("manage-dashboard-audit-section")}</SectionTitle>
          <AuditTiles>
            {auditCards.map(({ query, label, count }) => (
              <AuditTile
                key={query}
                type="button"
                onClick={() => navigate(`/m/photos?${query}`)}
                title={String(t("manage-dashboard-audit-tile-title", { label }))}
              >
                <AuditCount>{count}</AuditCount>
                <AuditLabel>{label}</AuditLabel>
              </AuditTile>
            ))}
          </AuditTiles>
        </>
      )}
      <SectionTitle>{t("manage-dashboard-navigation-section")}</SectionTitle>
      <Tiles>
        {tiles.map(({ path, Icon, titleKey, blurbKey }) => (
          <Tile
            key={path}
            type="button"
            onClick={() => navigate(path)}
          >
            <TileHeading>
              <Icon aria-hidden />
              {t(titleKey)}
            </TileHeading>
            <TileBlurb>{t(blurbKey)}</TileBlurb>
          </Tile>
        ))}
      </Tiles>
    </Root>
  );
};

export default Dashboard;
