import React from "react";
import PropTypes from "prop-types";

import Photo from "./Photo";

const Photos = ({ children, gallery, photos }) => {
  return (
    <div className="photos">
      {photos.map((photo, index) => {
        return (
          <div key={photo.id} className="photo-block">
            {index === 0 ? children : ""}
            <Photo gallery={gallery} photo={photo} />
          </div>
        );
      })}
    </div>
  );
};
Photos.propTypes = {
  photos: PropTypes.array.isRequired,
  gallery: PropTypes.array.isRequired,
  children: PropTypes.any,
};
export default Photos;
