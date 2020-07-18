import React from "react";
import PropTypes from "prop-types";

import GalleryLink from "./GalleryLink";
import FlagIcon from "./FlagIcon";

import config from "../utils/config";

const GalleryThumbnail = ({ gallery, photo }) => {
  const url = `url("${config.PHOTO_ROOT}thumbnail/${photo.id}")`;
  const style = {
    width: `${photo.dimensions.thumbnail.width + 10}px`,
    height: `${photo.dimensions.thumbnail.height + 10}px`,
    backgroundImage: url,
  };
  return (
    <div className="thumbnail">
      <GalleryLink gallery={gallery} photo={photo}>
        <span className="thumbnail" style={style}>
          <img src="https://gallery.misaki.fi/css/blank.gif" alt="" />
        </span>
      </GalleryLink>
      {photo.taken.location.country ? (
        <FlagIcon code={photo.taken.location.country} />
      ) : (
        ""
      )}
    </div>
  );
};
GalleryThumbnail.propTypes = {
  gallery: PropTypes.object.isRequired,
  photo: PropTypes.object.isRequired,
};
export default GalleryThumbnail;
