import React from "react";
import PropTypes from "prop-types";

import MapContainer from "../MapContainer";

const DayFooter = ({ gallery, year, month, day }) => {
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
    .photos(year, month, day)
    .filter((photo) => photo.hasCoordinates());

  return <div className="footer">{renderMap(photos)}</div>;
};
DayFooter.propTypes = {
  gallery: PropTypes.object.isRequired,
  year: PropTypes.number.isRequired,
  month: PropTypes.number.isRequired,
  day: PropTypes.number.isRequired,
};
export default DayFooter;
