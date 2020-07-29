import React from "react";
import PropTypes from "prop-types";

import Thumbnail from "./Thumbnail";

const Thumbnails = ({
  children,
  gallery,
  photos,
  lang,
  countryData,
}) => {
  return (
    <>
      {photos.map((photo, index) => {
        return (
          <div key={photo.id()} className="thumbnail-block">
            {index === 0 ? children : ""}
            <Thumbnail
              gallery={gallery}
              photo={photo}
              lang={lang}
              countryData={countryData}
            />
          </div>
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
