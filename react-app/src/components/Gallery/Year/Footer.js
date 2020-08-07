import React from "react";
import PropTypes from "prop-types";

import MapContainer from "../../MapContainer";
import Root from "../Footer";

const Footer = ({ gallery, year }) => {
  const renderMap = (positions) => {
    if (!positions || !positions.length) {
      return "";
    }
    return <MapContainer positions={positions} zoom="9" />;
  };

  const photos = gallery
    .flatMapMonths(year, (month) =>
      gallery.flatMapDays(year, month, (day) =>
        gallery.photos(year, month, day)
      )
    )
    .filter(Boolean)
    .filter((photo) => photo.hasCoordinates());
  return <Root>{renderMap(photos)}</Root>;
};
Footer.propTypes = {
  gallery: PropTypes.object.isRequired,
  year: PropTypes.number.isRequired,
};
export default Footer;
