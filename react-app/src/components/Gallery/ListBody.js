import React from "react";
import PropTypes from "prop-types";
import styled from "styled-components";

import Link from "./Link";

import config from "../../lib/config";
import theme from "../../lib/theme";

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
  background-color: var(--none-color);
`;
const GalleryTitle = styled.h3`
  color: ${(props) => props.color};
  background: ${(props) => props.background};
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

const ListBody = ({ galleries }) => {
  const renderIcon = (gallery) => {
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
  const renderGallery = (gallery) => {
    const activeTheme = gallery.hasTheme()
      ? theme.setTheme(gallery.theme())
      : theme.setTheme(config.DEFAULT_THEME);
    return (
      <Link key={gallery.id()} gallery={gallery}>
        <Gallery>
          <GalleryTitle
            color={activeTheme.get("header-color")}
            background={activeTheme.get("header-background")}
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
ListBody.propTypes = {
  galleries: PropTypes.array.isRequired,
};
export default ListBody;
