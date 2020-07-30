import React from "react";
import PropTypes from "prop-types";
import styled from "styled-components";

import Thumbnail from "./Thumbnail";

const Root = styled.div`
  vertical-align: top;
  display: flex;
  flex-wrap: nowrap;
`;

const Thumbnails = ({ children, gallery, photos, lang, countryData }) => {
  return (
    <>
      {photos.map((photo, index) => {
        return (
          <Root key={photo.id()}>
            {index === 0 ? children : ""}
            <Thumbnail
              gallery={gallery}
              photo={photo}
              lang={lang}
              countryData={countryData}
            />
          </Root>
        );
      })}
    </>
  );
};
Thumbnails.propTypes = {
  children: PropTypes.any,
  gallery: PropTypes.object.isRequired,
  photos: PropTypes.array.isRequired,
  lang: PropTypes.string.isRequired,
  countryData: PropTypes.object.isRequired,
};
export default Thumbnails;
