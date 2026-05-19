import React from "react";
import styled from "@emotion/styled";

import Link from "./Link";

import config from "../../lib/config";
import theme from "../../lib/theme";

import type { Gallery as GalleryT } from "../../models/GalleryModel";

const Root = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
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
  return <Root>{galleries.map((gallery) => renderGallery(gallery))}</Root>;
};
export default ListBody;
