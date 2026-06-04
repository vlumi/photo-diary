import React from "react";
import { useNavigate } from "react-router-dom";
import styled from "@emotion/styled";
import { useTranslation } from "react-i18next";
import {
  BsCollection,
  BsImages,
  BsPeople,
  BsPeopleFill,
  BsShieldLock,
} from "react-icons/bs";
import type { IconType } from "react-icons";

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

interface TileSpec {
  path: string;
  Icon: IconType;
  titleKey: string;
  blurbKey: string;
}

const TILES: TileSpec[] = [
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

const Dashboard = (): React.ReactElement => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  return (
    <Root>
      <Title>{t("manage-page-dashboard-title")}</Title>
      <Tiles>
        {TILES.map(({ path, Icon, titleKey, blurbKey }) => (
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
