import React from "react";
import PropTypes from "prop-types";
import { Redirect } from "react-router-dom";
import styled from "styled-components";
import { useTranslation } from "react-i18next";
import { BsFillHouseFill } from "react-icons/bs";

import Link from "./Link";

const Root = styled.div`
  display: flex;
  flex-wrap: nowrap;
  justify-content: space-between;
  align-items: center;
  padding: 0 5px;
`;
const MainTitle = styled.h1`
  margin: 0;
`;
const TitleSelect = styled.select`
  font-size: 1em;
  background: none;
  border: none;
  font-weight: bold;
  text-align-last: right;
`;
const GallerySelect = styled(TitleSelect)`
  text-align-last: right;
`;
const ContextSelect = styled(TitleSelect)`
  text-align-last: left;
`;
const TitleOption = styled.option``;

const Title = ({ user, context, galleries, gallery, year, month, day }) => {
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

  const getRedirectPath = (gallery, context) => {
    gallery.setViewMode();
    switch (context) {
      default:
      case "gallery":
        return gallery.path(year, month, day);
      case "stats":
        return gallery.statsPath();
      case "edit":
        if (user && user.isAdmin()) {
          gallery.setEditMode();
          return gallery.path(year, month, day);
        }
        return "";
    }
  };

  const renderIcon = () => {
    if (!gallery) {
      return <div />;
    }
    return (
      <Link>
        <BsFillHouseFill />
      </Link>
    );
  };
  const renderTitle = () => {
    const changeHandler = (event) => {
      const targetGallery = galleries.find(
        (gallery) => gallery.id() === event.target.value
      );
      if (targetGallery && gallery.id !== targetGallery.id) {
        window.history.pushState({}, "");
        setRedirect(getRedirectPath(targetGallery, context));
      }
    };
    if (!gallery) {
      return <>{t("nav-galleries")}</>;
    }

    if (Object.keys(galleries).length > 1) {
      return (
        <GallerySelect value={gallery.id()} onChange={changeHandler}>
          {galleries.map((gallery) => (
            <TitleOption key={gallery.id()} value={gallery.id()}>
              {gallery.title()}
            </TitleOption>
          ))}
        </GallerySelect>
      );
    }
    return <>{gallery.title()}</>;
  };
  const renderContext = () => {
    if (!gallery) {
      return <div />;
    }
    const changeHandler = (event) => {
      const targetContext = event.target.value;
      if (targetContext && context !== targetContext) {
        window.history.pushState({}, "");
        setRedirect(getRedirectPath(gallery, targetContext));
      }
    };
    const contexts = ["gallery", "stats"];
    if (user && user.isAdmin()) {
      contexts.push("edit");
    }
    return (
      <ContextSelect value={context} onChange={changeHandler}>
        {contexts.map((context) => (
          <TitleOption key={context} value={context}>
            {t(`nav-${context}`)}
          </TitleOption>
        ))}
      </ContextSelect>
    );
  };

  return (
    <Root>
      {renderIcon()}
      <MainTitle>{renderTitle()}</MainTitle>
      {renderContext()}
    </Root>
  );
};
Title.propTypes = {
  user: PropTypes.object,
  context: PropTypes.string.isRequired,
  galleries: PropTypes.array.isRequired,
  gallery: PropTypes.object.isRequired,
  year: PropTypes.number,
  month: PropTypes.number,
  day: PropTypes.number,
};
export default Title;
