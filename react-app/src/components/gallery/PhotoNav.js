import React from "react";
import PropTypes from "prop-types";

import Link from "./Link";

const PhotoNav = ({ gallery, year, month, day, photo }) => {
  const [firstYear, firstMonth, firstDay] = gallery.firstDay();
  const [lastYear, lastMonth, lastDay] = gallery.lastDay();

  const firstDayPhotos = gallery.photos(firstYear, firstMonth, firstDay);
  const firstPhoto = firstDayPhotos[0];

  const previousPhoto = gallery.previousPhoto(year, month, day, photo);
  const nextPhoto = gallery.nextPhoto(year, month, day, photo);

  const prevStyle =
    previousPhoto && previousPhoto === photo ? { visibility: "hidden" } : {};
  const nextStyle =
    nextPhoto && nextPhoto === photo ? { visibility: "hidden" } : {};

  const lastDayPhotos = gallery.photos(lastYear, lastMonth, lastDay);
  const lastPhoto = lastDayPhotos[lastDayPhotos.length - 1];
  return (
    <h2 className="photo">
      <Link gallery={gallery} photo={firstPhoto}>
        <span style={prevStyle}>⇤</span>
      </Link>
      <Link gallery={gallery} photo={previousPhoto}>
        <span style={prevStyle}>←</span>
      </Link>
      <Link gallery={gallery} year={year} month={month}>
        <span className="title">#{photo ? photo.index() + 1 : ""}</span>
      </Link>
      <Link gallery={gallery} photo={nextPhoto}>
        <span style={nextStyle}>→</span>
      </Link>
      <Link gallery={gallery} photo={lastPhoto}>
        <span style={nextStyle}>⇥</span>
      </Link>
    </h2>
  );
};
PhotoNav.propTypes = {
  gallery: PropTypes.object.isRequired,
  year: PropTypes.number.isRequired,
  month: PropTypes.number.isRequired,
  day: PropTypes.number.isRequired,
  photo: PropTypes.object.isRequired,
};
export default PhotoNav;
