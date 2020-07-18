import React from "react";
import PropTypes from "prop-types";

import config from "../utils/config";

const BodyPhoto = ({ photo }) => {
  const style = {
    width: `${photo.dimensions.display.width}px`,
    height: `${photo.dimensions.display.height}px`,
  };
  const path = `${config.PHOTO_ROOT}display/${photo.id}`;

  return (
    <>
      <div className="layer"></div>
      <div className="photo">
        <span className="photo" style={style}>
          <img src={path} alt={photo.id} />
        </span>
      </div>
    </>
  );
};
BodyPhoto.propTypes = {
  photo: PropTypes.object.isRequired,
};
export default BodyPhoto;
