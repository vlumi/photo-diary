import React from "react";
import PropTypes from "prop-types";
import { Link as ReactLink } from "react-router-dom";

const Link = ({ children, gallery, year, month, photo, day }) => {
  if (photo) {
    return <ReactLink to={photo.path(gallery)}>{children}</ReactLink>;
  }
  if (!gallery) {
    return <ReactLink to="/g">{children}</ReactLink>;
  }
  const path = gallery.path(year, month, day);
  return <ReactLink to={path}>{children}</ReactLink>;
};

Link.propTypes = {
  children: PropTypes.any.isRequired,
  gallery: PropTypes.object,
  year: PropTypes.number,
  month: PropTypes.number,
  day: PropTypes.number,
  photo: PropTypes.object,
};
export default Link;
