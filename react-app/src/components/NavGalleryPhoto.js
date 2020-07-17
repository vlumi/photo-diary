import React from "react";
import PropTypes from "prop-types";

import GalleryLink from "./GalleryLink";
import DateLink from "./DateLink";

const NavGalleryPhoto = ({ gallery, year, month, day, photo }) => {
  const [firstYear, firstMonth, firstDay] = gallery.firstYearMonthDay();
  const [lastYear, lastMonth, lastDay] = gallery.lastYearMonthDay();

  const firstDayPhotos = gallery.getPhotos(firstYear, firstMonth, firstDay);
  const firstPhoto = firstDayPhotos[0];

  const previousPhoto = gallery.getPreviousPhoto(year, month, day, photo);
  const nextPhoto = gallery.getNextPhoto(year, month, day, photo);

  const prevStyle = previousPhoto ? {} : { visibility: "hidden" };
  const nextStyle = nextPhoto ? {} : { visibility: "hidden" };

  const lastDayPhotos = gallery.getPhotos(lastYear, lastMonth, lastDay);
  const lastPhoto = lastDayPhotos[lastDayPhotos.length - 1];
  return (
    <h2>
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
NavGalleryPhoto.propTypes = {
  gallery: PropTypes.object.isRequired,
  year: PropTypes.number.isRequired,
  month: PropTypes.number.isRequired,
  day: PropTypes.number.isRequired,
  photo: PropTypes.object.isRequired,
};
export default NavGalleryPhoto;
