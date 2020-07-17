import React from "react";
import PropTypes from "prop-types";

import GalleryLink from "./GalleryLink";

import config from "../utils/config";

const Photo = ({ gallery, photo }) => {
  const thumbUrl = `url("${config.PHOTO_ROOT}thumbnail/${photo.id}")`;
  const style = {
    width: `${photo.dimensions.thumbnail.width + 10}px`,
    height: `${photo.dimensions.thumbnail.height + 10}px`,
    backgroundImage: thumbUrl,
  };
  return (
    <div className="photo">
      <GalleryLink gallery={gallery} photo={photo}>
        <span className="photo" style={style}>
          <img src="https://gallery.misaki.fi/css/blank.gif" alt="" />
        </span>
      </GalleryLink>
    </div>
  );
};
Photo.propTypes = {
  gallery: PropTypes.object.isRequired,
  photo: PropTypes.object.isRequired,
};
export default Photo;
