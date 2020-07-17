import React from "react";
import PropTypes from "prop-types";
import { Link } from "react-router-dom";

import calendar from "../utils/calendar";

const GalleryLink = ({ children, gallery, year, month, photo, day }) => {
  if (photo) {
    const path = calendar.formatDate({
      year: photo.taken.instant.year,
      month: photo.taken.instant.month,
      day: photo.taken.instant.day,
      divider: "/",
    });
    return <Link to={`/g/${gallery.id}/${path}/${photo.id}`}>{children}</Link>;
  }
  if (!year) {
    return "";
  }
  if (!month) {
    const path = calendar.formatDate({ year, divider: "/" });
    return <Link to={`/g/${gallery.id}/${path}`}>{children}</Link>;
  }
  if (!day) {
    const path = calendar.formatDate({ year, month, divider: "/" });
    return <Link to={`/g/${gallery.id}/${path}`}>{children}</Link>;
  }
  if (!photo) {
    const path = calendar.formatDate({ year, month, day, divider: "/" });
    return <Link to={`/g/${gallery.id}/${path}`}>{children}</Link>;
  }
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
