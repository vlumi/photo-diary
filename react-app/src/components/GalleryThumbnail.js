import React from "react";
import PropTypes from "prop-types";

import GalleryLink from "./GalleryLink";
import FlagIcon from "./FlagIcon";

import config from "../utils/config";

const GalleryThumbnail = ({ gallery, photo, lang, countryData }) => {
  const url = `url("${config.PHOTO_ROOT_URL}thumbnail/${photo.id()}")`;
  const dimensions = photo.thumbnailDimensions();
  const style = {
    width: `${dimensions.width + 10}px`,
    height: `${dimensions.height + 10}px`,
    backgroundImage: url,
  };
  return (
    <div className="thumbnail">
      <GalleryLink gallery={gallery} photo={photo}>
        <span className="thumbnail" style={style}></span>
      </GalleryLink>
      {photo.hasCountry() ? (
        <span className="flag" title={photo.countryName(lang, countryData)}>
          <FlagIcon code={photo.countryCode()} />
        </span>
      ) : (
        ""
      )}
    </div>
  );
};
GalleryThumbnail.propTypes = {
  gallery: PropTypes.object.isRequired,
  photo: PropTypes.object.isRequired,
  lang: PropTypes.string.isRequired,
  countryData: PropTypes.object.isRequired,
};
export default GalleryThumbnail;
