import React from "react";
import PropTypes from "prop-types";

import GalleryThumbnail from "./GalleryThumbnail";

const GalleryThumbnails = ({ children, gallery, photos }) => {
  return (
    <>
      {photos.map((photo, index) => {
        return (
          <div key={photo.id} className="thumbnail-block">
            {index === 0 ? children : ""}
            <GalleryThumbnail gallery={gallery} photo={photo} />
          </div>
        );
      })}
    </>
  );
};
GalleryThumbnails.propTypes = {
  children: PropTypes.any,
  gallery: PropTypes.object.isRequired,
  photos: PropTypes.array.isRequired,
};
export default GalleryThumbnails;
