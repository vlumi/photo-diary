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

const Title = ({ galleries, gallery, context, year, month, day }) => {
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
    switch (context) {
      default:
      case "gallery":
        return gallery.path(year, month, day);
      case "stats":
        return gallery.statsPath();
    }
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
    const changeHandler = (event) => {
      const targetContext = event.target.value;
      if (targetContext && context !== targetContext) {
        window.history.pushState({}, "");
        setRedirect(getRedirectPath(gallery, targetContext));
      }
    };
    return (
      <ContextSelect value={context} onChange={changeHandler}>
        {["gallery", "stats"].map((context) => (
          <TitleOption key={context} value={context}>
            {t(`nav-${context}`)}
          </TitleOption>
        ))}
      </ContextSelect>
    );
  };

  return (
    <Root>
      <Link>
        <BsFillHouseFill />
      </Link>
      <MainTitle>{renderTitle()}</MainTitle>
      {renderContext()}
    </Root>
  );
};
Title.propTypes = {
  galleries: PropTypes.array.isRequired,
  gallery: PropTypes.object.isRequired,
  context: PropTypes.string.isRequired,
  year: PropTypes.number,
  month: PropTypes.number,
  day: PropTypes.number,
};
export default Title;
