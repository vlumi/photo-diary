import React from "react";
import PropTypes from "prop-types";

import MapContainer from "./MapContainer";

const GalleryDayFooter = ({ gallery, year, month, day }) => {
  const renderMap = (positions) => {
    if (!positions) {
      return "";
    }
    return (
      <>
        <MapContainer positions={positions} zoom="9" />
      </>
    );
  };

  const positions = gallery
    .photos(year, month, day)
    .filter((photo) => photo.hasCoordinates())
    .map((photo) => photo.coordinates());

  return <div className="footer">{renderMap(positions)}</div>;
};
GalleryDayFooter.propTypes = {
  gallery: PropTypes.object.isRequired,
  year: PropTypes.number.isRequired,
  month: PropTypes.number.isRequired,
  day: PropTypes.number.isRequired,
};
export default GalleryDayFooter;
