import React from "react";
import PropTypes from "prop-types";

import GalleryLink from "./GalleryLink";
import FormatDate from "./FormatDate";

const GalleryPhotoNav = ({ gallery, year, month, day, photo }) => {
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
      <span style={prevStyle}>
        <GalleryLink gallery={gallery} photo={firstPhoto}>
          ⇤
        </GalleryLink>
      </span>
      <span style={prevStyle}>
        <GalleryLink gallery={gallery} photo={previousPhoto}>
          ←
        </GalleryLink>
      </span>
      <span className="title">
        <GalleryLink gallery={gallery} year={year} month={month}>
          #{photo.index + 1}
        </GalleryLink>
      </span>
      <span style={nextStyle}>
        <GalleryLink gallery={gallery} photo={nextPhoto}>
          →
        </GalleryLink>
      </span>
      <span style={nextStyle}>
        <GalleryLink gallery={gallery} photo={lastPhoto}>
          ⇥
        </GalleryLink>
      </span>
    </h2>
  );
};
GalleryPhotoNav.propTypes = {
  gallery: PropTypes.object.isRequired,
  year: PropTypes.number.isRequired,
  month: PropTypes.number.isRequired,
  day: PropTypes.number.isRequired,
  photo: PropTypes.object.isRequired,
};
export default GalleryPhotoNav;
