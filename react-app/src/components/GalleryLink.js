import React from "react";
import PropTypes from "prop-types";
import { Link } from "react-router-dom";

const GalleryLink = ({ children, gallery, year, month, photo, day }) => {
  if (photo) {
    return <Link to={gallery.getPhotoPath(photo)}>{children}</Link>;
  }
  if (!year) {
    return "";
  }
  const path = gallery.getPath(year, month, day);
  return <Link to={path}>{children}</Link>;
};

GalleryLink.propTypes = {
  children: PropTypes.any.isRequired,
  gallery: PropTypes.object.isRequired,
  year: PropTypes.number,
  month: PropTypes.number,
  day: PropTypes.number,
  photo: PropTypes.object,
};
export default GalleryLink;
