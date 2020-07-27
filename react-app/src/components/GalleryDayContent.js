import React from "react";
import PropTypes from "prop-types";

import GalleryTitle from "./GalleryTitle";
import GalleryThumbnails from "./GalleryThumbnails";

const GalleryDayContent = ({
  gallery,
  year,
  month,
  day,
  lang,
  countryData,
}) => {
  if (!gallery.includesDay(year, month, day)) {
    return <i>Empty</i>;
  }

  const renderContent = () => {
    return (
      <GalleryThumbnails
        gallery={gallery}
        photos={gallery.photos(year, month, day)}
        lang={lang}
        countryData={countryData}
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
  lang: PropTypes.string.isRequired,
  countryData: PropTypes.object.isRequired,
};
export default GalleryDayContent;
