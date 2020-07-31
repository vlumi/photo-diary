import React from "react";
import PropTypes from "prop-types";
import { Redirect } from "react-router-dom";
import styled from "styled-components";
import { useTranslation } from "react-i18next";

import Link from "./Link";
const Root = styled.h1`
  margin: 0;
`;
const GallerySelect = styled.select`
  font-size: 1em;
  background: none;
  border: none;
  font-weight: bold;
  text-align-last: right;
`;
const GalleryOption = styled.option``;

const Title = ({ galleries, gallery, context }) => {
  const [redirect, setRedirect] = React.useState(undefined);

  const { t } = useTranslation();

  React.useEffect(() => {
    if (redirect) {
      const handle = setTimeout(() => setRedirect(""), 0);
      return () => {
        setRedirect("");
        clearTimeout(handle);
      };
    }
  }, [redirect]);
  if (redirect) {
    return <Redirect to={redirect} />;
  }

  const getRedirectPath = (gallery) => {
    switch (context) {
      default:
      case "gallery":
        return gallery.path();
      case "gallery-stats":
        return gallery.statsPath();
    }
  };

  const galleryChangeHandler = (event) => {
    const targetGallery = galleries.find(
      (gallery) => gallery.id() === event.target.value
    );
    if (targetGallery && gallery.id !== targetGallery.id) {
      window.history.pushState({}, "");
      setRedirect(getRedirectPath(targetGallery));
    }
  };

  const getTargetContext = (context) => {
    switch (context) {
      default:
      case "gallery":
        return "gallery-stats";
      case "gallery-stats":
        return "gallery";
    }
  };

  const renderContextSwitch = () => {
    const targetContext = getTargetContext(context);
    return (
      <span className="stats">
        <Link gallery={gallery} context={targetContext}>
          {t(`nav-${targetContext}`)}
        </Link>
      </span>
    );
  };

  const renderTitle = () => {
    if (Object.keys(galleries).length > 1) {
      return (
        <GallerySelect value={gallery.id()} onChange={galleryChangeHandler}>
          {galleries.map((gallery) => (
            <GalleryOption key={gallery.id()} value={gallery.id()}>
              {gallery.title()}
            </GalleryOption>
          ))}
        </GallerySelect>
      );
    }
    return <>{gallery.title()}</>;
  };
  // TODO: show filters, allowing modification (clear, remove part, add part)
  return (
    <>
      <span className="gallery-menu">
        <span className="top">
          <Link>{t("nav-gallery-top")}</Link>
        </span>
        {renderContextSwitch()}
      </span>
      <Root>
        {renderTitle()}
        {context ? <> — {t(`nav-${context}`)}</> : ""}
      </Root>
    </>
  );
};
Title.propTypes = {
  galleries: PropTypes.array.isRequired,
  gallery: PropTypes.object.isRequired,
  filters: PropTypes.object.isRequired,
  setFilters: PropTypes.func.isRequired,
  context: PropTypes.string,
};
export default Title;
