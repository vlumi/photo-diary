import React from "react";
import PropTypes from "prop-types";

import MapContainer from "./MapContainer";

const GalleryYearFooter = ({ gallery, year }) => {
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
    .flatMapMonths(year, (month) =>
      gallery.flatMapDays(year, month, (day) =>
        gallery.photos(year, month, day)
      )
    )
    .filter((photo) => photo.hasCoordinates())
    .map((photo) => photo.coordinates());

  return <div className="footer">{renderMap(positions)}</div>;
};
GalleryYearFooter.propTypes = {
  gallery: PropTypes.object.isRequired,
  year: PropTypes.number.isRequired,
};
export default GalleryYearFooter;
