import React from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import styled from "@emotion/styled";
import { BsBarChartLine, BsGearFill } from "react-icons/bs";

import Link from "./Link";

import config from "../../lib/config";
import theme from "../../lib/theme";
import { useHostScope } from "../../lib/use-host-scope";
import { useUserStore } from "../../stores";

import type { Gallery as GalleryT } from "../../models/GalleryModel";

const Root = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
`;
const Gallery = styled.div`
  width: 214px;
  min-height: 200px;
  margin: 5px;
  padding: 0;
  border-style: solid;
  border-width: 1px;
  background-color: var(--header-color);
`;
const Row = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
`;
const ShortcutsRow = styled(Row)`
  margin-bottom: 8px;
`;
const Shortcut = styled.button`
  width: 214px;
  min-height: 96px;
  margin: 5px;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  border: 1px solid var(--inactive-color);
  border-radius: 4px;
  background: var(--primary-background);
  color: var(--primary-color);
  font: inherit;
  text-align: left;
  cursor: pointer;
  &:hover {
    background: var(--header-background);
    color: var(--header-color);
    border-color: var(--header-background);
  }
`;
const ShortcutTitle = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-weight: bold;
`;
const ShortcutBlurb = styled.div`
  font-size: 0.85em;
  opacity: 0.75;
  line-height: 1.4;
`;
const GalleryTitle = styled("h3", {
  shouldForwardProp: (prop) => prop !== "$color" && prop !== "$background",
})<{ $color: string; $background: string }>`
  color: ${(props) => props.$color};
  background: ${(props) => props.$background};
  font-size: 18pt;
  text-align: center;
  margin: 0;
`;
const IconContainer = styled.div`
  margin: 0;
`;
const Icon = styled.img`
  width: 100%;
`;
const Description = styled.div`
  margin: 5px;
  text-align: left;
`;

interface Props {
  galleries: GalleryT[];
}

const ListBody = ({ galleries }: Props): React.ReactElement => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useUserStore((s) => s.user);
  const isAdmin = !!user?.isAdmin();
  const { isHostScoped } = useHostScope();
  const renderIcon = (gallery: GalleryT) => {
    if (!gallery.hasIcon()) {
      return "";
    }
    const url = `${config.PHOTO_ROOT_URL}${gallery.icon()}`;
    return (
      <IconContainer>
        <Icon src={url} alt={gallery.title()} />
      </IconContainer>
    );
  };
  const renderGallery = (gallery: GalleryT) => {
    const themeName = gallery.theme();
    const activeTheme =
      gallery.hasTheme() && themeName
        ? theme.setTheme(themeName)
        : theme.setTheme(config.DEFAULT_THEME);
    return (
      <Link key={gallery.id()} gallery={gallery}>
        <Gallery>
          <GalleryTitle
            $color={activeTheme.get("header-color")}
            $background={activeTheme.get("header-background")}
          >
            {gallery.title()}
          </GalleryTitle>
          {renderIcon(gallery)}
          <Description>{gallery.description()}</Description>
        </Gallery>
      </Link>
    );
  };
  return (
    <Root>
      {isAdmin && (
        <ShortcutsRow>
          <Shortcut type="button" onClick={() => navigate("/m")}>
            <ShortcutTitle>
              <BsGearFill aria-hidden />
              {t("landing-shortcut-manage")}
            </ShortcutTitle>
            <ShortcutBlurb>{t("landing-shortcut-manage-blurb")}</ShortcutBlurb>
          </Shortcut>
          {!isHostScoped && (
            <Shortcut type="button" onClick={() => navigate("/s")}>
              <ShortcutTitle>
                <BsBarChartLine aria-hidden />
                {t("landing-shortcut-stats")}
              </ShortcutTitle>
              <ShortcutBlurb>{t("landing-shortcut-stats-blurb")}</ShortcutBlurb>
            </Shortcut>
          )}
        </ShortcutsRow>
      )}
      <Row>{galleries.map((gallery) => renderGallery(gallery))}</Row>
    </Root>
  );
};
export default ListBody;
