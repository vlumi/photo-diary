import React from "react";
import PropTypes from "prop-types";

import DateLink from "./DateLink";
import GalleryLink from "./GalleryLink";

const GalleryMonthNav = ({ gallery, year, month }) => {
  const prevStyle = gallery.isFirstMonth(year, month)
    ? { visibility: "hidden" }
    : {};
  const nextStyle = gallery.isLastMonth(year, month)
    ? { visibility: "hidden" }
    : {};

  const [firstYear, firstMonth] = gallery.firstMonth();
  const [previousYear, previousMonth] = gallery.previousMonth(year, month);
  const [nextYear, nextMonth] = gallery.nextMonth(year, month);
  const [lastYear, lastMonth] = gallery.lastMonth();
  return (
    <h2>
      <GalleryLink gallery={gallery} year={firstYear} month={firstMonth}>
        <span style={prevStyle}>⇤</span>
      </GalleryLink>
      <GalleryLink gallery={gallery} year={previousYear} month={previousMonth}>
        <span style={prevStyle}>←</span>
      </GalleryLink>
      <DateLink gallery={gallery} year={year} month={month}></DateLink>
      <GalleryLink gallery={gallery} year={nextYear} month={nextMonth}>
        <span style={nextStyle}>→</span>
      </GalleryLink>
      <GalleryLink gallery={gallery} year={lastYear} month={lastMonth}>
        <span style={nextStyle}>⇥</span>
      </GalleryLink>
    </h2>
  );
};
GalleryMonthNav.propTypes = {
  gallery: PropTypes.object.isRequired,
  year: PropTypes.number.isRequired,
  month: PropTypes.number.isRequired,
};
export default GalleryMonthNav;
