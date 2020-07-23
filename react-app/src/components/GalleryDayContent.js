import React from "react";
import PropTypes from "prop-types";

import GalleryTitle from "./GalleryTitle";
import GalleryThumbnails from "./GalleryThumbnails";

const GalleryDayContent = ({ gallery, year, month, day }) => {
  if (!gallery.includesDay(year, month, day)) {
    return <i>Empty</i>;
  }

  const renderContent = () => {
    return (
      <GalleryThumbnails
        gallery={gallery}
        photos={gallery.photos(year, month, day)}
      />
    );
  };

  // TODO: epoch & epochMode
  return (
    <>
      <GalleryTitle gallery={gallery} />
      <div className="day">{renderContent()}</div>
    </>
  );
};
GalleryDayContent.propTypes = {
  gallery: PropTypes.object.isRequired,
  year: PropTypes.number.isRequired,
  month: PropTypes.number.isRequired,
  day: PropTypes.number.isRequired,
};
export default GalleryDayContent;
