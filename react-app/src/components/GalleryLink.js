import React from "react";
import PropTypes from "prop-types";
import { Link } from "react-router-dom";

import calendar from "../utils/calendar";

const GalleryLink = ({ children, gallery, year, month, day }) => {
  if (!month) {
    const path = calendar.formatDate({ year, divider: "/" });
    return <Link to={`/g/${gallery.id}/${path}`}>{children}</Link>;
  }
  if (!day) {
    const path = calendar.formatDate({ year, month, divider: "/" });
    return <Link to={`/g/${gallery.id}/${path}`}>{children}</Link>;
  }
  const path = calendar.formatDate({ year, month, day, divider: "/" });
  return (
    <Link to={`/g/${gallery.id}/${path}`}>{children}</Link>
  );
};

GalleryLink.propTypes = {
  children: PropTypes.any.isRequired,
  gallery: PropTypes.object.isRequired,
  year: PropTypes.number.isRequired,
  month: PropTypes.number,
  day: PropTypes.number,
};
export default GalleryLink;
