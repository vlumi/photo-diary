import React from "react";
import PropTypes from "prop-types";

import GalleryLink from "./GalleryLink";
import DateLink from "./DateLink";

import calendar from "../utils/calendar";

const getCurrentPhotoIndex = (gallery, year, month, day, currentPhoto) => {
  const currentDayPhotos = gallery.photos[year][month][day];
  const currentIndex = currentDayPhotos.findIndex(
    (photo) => photo.id === currentPhoto.id
  );
  return currentIndex;
};

const getPreviousPhoto = (gallery, year, month, day, currentIndex) => {
  const currentDayPhotos = gallery.photos[year][month][day];
  if (currentIndex > 0) {
    return currentDayPhotos[currentIndex - 1];
  }
  const [
    previousYear,
    previousMonth,
    previousDay,
  ] = calendar.previousYearMonthDay(gallery, year, month, day);
  if (!previousYear || !previousMonth || !previousDay) {
    return undefined;
  }
  const previousDayPhotos =
    gallery.photos[previousYear][previousMonth][previousDay];
  if (!previousDayPhotos || previousDayPhotos.length === 0) {
    return undefined;
  }
  return previousDayPhotos[previousDayPhotos.length - 1];
};
const getNextPhoto = (gallery, year, month, day, currentIndex) => {
  const currentDayPhotos = gallery.photos[year][month][day];
  if (currentIndex < currentDayPhotos.length - 1) {
    return currentDayPhotos[currentIndex + 1];
  }
  const [nextYear, nextMonth, nextDay] = calendar.nextYearMonthDay(
    gallery,
    year,
    month,
    day
  );
  if (!nextYear || !nextMonth || !nextDay) {
    return undefined;
  }
  const nextDayPhotos = gallery.photos[nextYear][nextMonth][nextDay];
  if (!nextDayPhotos || nextDayPhotos.length === 0) {
    return undefined;
  }
  return nextDayPhotos[0];
};

const NavGalleryPhoto = ({ gallery, year, month, day, photo }) => {
  const [firstYear, firstMonth, firstDay] = calendar.firstYearMonthDay(gallery);
  const [lastYear, lastMonth, lastDay] = calendar.lastYearMonthDay(gallery);

  const firstDayPhotos = gallery.photos[firstYear][firstMonth][firstDay];
  const firstPhoto = firstDayPhotos[0];

  const currentIndex = getCurrentPhotoIndex(gallery, year, month, day, photo);
  const previousPhoto = getPreviousPhoto(
    gallery,
    year,
    month,
    day,
    currentIndex
  );
  const nextPhoto = getNextPhoto(gallery, year, month, day, currentIndex);

  const prevStyle = previousPhoto ? {} : { visibility: "hidden" };
  const nextStyle = nextPhoto ? {} : { visibility: "hidden" };

  const lastDayPhotos = gallery.photos[lastYear][lastMonth][lastDay];
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
