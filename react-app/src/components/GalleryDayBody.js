import React from "react";
import PropTypes from "prop-types";

import GalleryThumbnails from "./GalleryThumbnails";

const GalleryDayBody = ({ gallery, year, month, day }) => {
  if (!gallery.includesDay(year, month, day)) {
    return <i>Empty</i>;
  }
  return (
    <>
      {gallery.includesDay(year, month, day) ? (
        <GalleryThumbnails
          gallery={gallery}
          photos={gallery.photos(year, month, day)}
        />
      ) : (
        ""
      )}
    </>
  );
};
GalleryDayBody.propTypes = {
  gallery: PropTypes.object.isRequired,
  year: PropTypes.number.isRequired,
  month: PropTypes.number.isRequired,
  day: PropTypes.number.isRequired,
};
export default GalleryDayBody;
