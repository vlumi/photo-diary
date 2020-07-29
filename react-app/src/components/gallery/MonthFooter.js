import React from "react";
import PropTypes from "prop-types";

import MapContainer from "../MapContainer";

const MonthFooter = ({ gallery, year, month }) => {
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

  const photos = gallery
    .flatMapDays(year, month, (day) => gallery.photos(year, month, day))
    .filter((photo) => photo.hasCoordinates());

  return <div className="footer">{renderMap(photos)}</div>;
};
MonthFooter.propTypes = {
  gallery: PropTypes.object.isRequired,
  year: PropTypes.number.isRequired,
  month: PropTypes.number.isRequired,
};
export default MonthFooter;
