import React from "react";
import PropTypes from "prop-types";

import DateLink from "./DateLink";
import GalleryLink from "./GalleryLink";

const GalleryYearNav = ({ gallery, year }) => {
  const prevStyle = gallery.isFirstYear(year) ? { visibility: "hidden" } : {};
  const nextStyle = gallery.isLastYear(year) ? { visibility: "hidden" } : {};

  const firstYear = gallery.firstYear();
  const previousYear = gallery.previousYear(year);
  const nextYear = gallery.nextYear(year);
  const lastYear = gallery.lastYear();
  return (
    <h2>
      <GalleryLink gallery={gallery} year={firstYear}>
        <span style={prevStyle}>⇤</span>
      </GalleryLink>
      <GalleryLink gallery={gallery} year={previousYear}>
        <span style={prevStyle}>←</span>
      </GalleryLink>
      <DateLink gallery={gallery} year={year} />
      <GalleryLink gallery={gallery} year={nextYear}>
        <span style={nextStyle}>→</span>
      </GalleryLink>
      <GalleryLink gallery={gallery} year={lastYear}>
        <span style={nextStyle}>⇥</span>
      </GalleryLink>
    </h2>
  );
};
GalleryYearNav.propTypes = {
  gallery: PropTypes.object.isRequired,
  year: PropTypes.number.isRequired,
};
export default GalleryYearNav;
