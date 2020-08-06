import React from "react";
import PropTypes from "prop-types";
import styled from "styled-components";

import Thumbnails from "../Thumbnails";

const Root = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
`;

const Content = ({
  children,
  gallery,
  year,
  month,
  day,
  lang,
  countryData,
}) => {
  if (!gallery.includesDay(year, month, day)) {
    return <i>Empty</i>;
  }

  const renderContent = () => {
    return (
      <Thumbnails
        gallery={gallery}
        photos={gallery.photos(year, month, day)}
        lang={lang}
        countryData={countryData}
      />
    );
  };

  // TODO: epoch & epochMode
  return (
    <>
      {children}
      <Root>{renderContent()}</Root>
    </>
  );
};
Content.propTypes = {
  children: PropTypes.any,
  gallery: PropTypes.object.isRequired,
  year: PropTypes.number.isRequired,
  month: PropTypes.number.isRequired,
  day: PropTypes.number.isRequired,
  lang: PropTypes.string.isRequired,
  countryData: PropTypes.object.isRequired,
};
export default Content;
