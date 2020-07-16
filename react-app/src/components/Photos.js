import React from "react";
import PropTypes from "prop-types";

import Photo from "./Photo";

const Photos = ({ children, photos }) => {
  return (
    <div className="photos">
      {photos.map((photo, index) => {
        return (
          <span key={photo.id}>
            {index === 0 ? children : ""}
            <Photo photo={photo} />
          </span>
        );
      })}
    </div>
  );
};
Photos.propTypes = {
  photos: PropTypes.array.isRequired,
  children: PropTypes.object,
};
export default Photos;
