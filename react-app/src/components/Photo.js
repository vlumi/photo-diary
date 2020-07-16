import React from "react";
import PropTypes from "prop-types";

import config from "../utils/config";

const Photo = ({ photo }) => {
  console.log("root", config.PHOTO_ROOT);
  const thumbUrl = `url(${config.PHOTO_ROOT}/thumbnail/${photo.id})`;
  const style = {
    width: `${photo.dimensions.thumbnail.width + 10}px`,
    height: `${photo.dimensions.thumbnail.height + 10}px`,
    backgroundImage: thumbUrl,
  };
  return (
    <div className="photo">
      <span className="photo" style={style}>
        <img src="https://gallery.misaki.fi/css/blank.gif" alt="" />
      </span>
    </div>
  );
};
Photo.propTypes = {
  photo: PropTypes.object.isRequired,
};
export default Photo;
