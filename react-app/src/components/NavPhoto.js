import React from "react";
import PropTypes from "prop-types";

import GalleryLink from "./GalleryLink";
import DateLink from "./DateLink";

const NavPhoto = ({ gallery, year, month, day, photo }) => {
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
      <span title="First photo" style={prevStyle}>
        <GalleryLink gallery={gallery} photo={firstPhoto}>
          ⇤
        </GalleryLink>
      </span>
      <span title="Previous photo" style={prevStyle}>
        <GalleryLink gallery={gallery} photo={previousPhoto}>
          ←
        </GalleryLink>
      </span>
      <span className="title">
        <DateLink gallery={gallery} year={year} month={month} day={day} /> #
        {photo.index + 1}
      </span>
      <span title="Next photo" style={nextStyle}>
        <GalleryLink gallery={gallery} photo={nextPhoto}>
          →
        </GalleryLink>
      </span>
      <span title="Last photo" style={nextStyle}>
        <GalleryLink gallery={gallery} photo={lastPhoto}>
          ⇥
        </GalleryLink>
      </span>
    </h2>
  );
};
NavPhoto.propTypes = {
  gallery: PropTypes.object.isRequired,
  year: PropTypes.number.isRequired,
  month: PropTypes.number.isRequired,
  day: PropTypes.number.isRequired,
  photo: PropTypes.object.isRequired,
};
export default NavPhoto;
