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
      <span style={prevStyle}>
        <GalleryLink gallery={gallery} year={firstYear}>
          ⇤
        </GalleryLink>
      </span>
      <span style={prevStyle}>
        <GalleryLink gallery={gallery} year={previousYear}>
          ←
        </GalleryLink>
      </span>
      <span className="title">
        <DateLink gallery={gallery} year={year} />
      </span>
      <span style={nextStyle}>
        <GalleryLink gallery={gallery} year={nextYear}>
          →
        </GalleryLink>
      </span>
      <span style={nextStyle}>
        <GalleryLink gallery={gallery} year={lastYear}>
          ⇥
        </GalleryLink>
      </span>
    </h2>
  );
};
GalleryYearNav.propTypes = {
  gallery: PropTypes.object.isRequired,
  year: PropTypes.number.isRequired,
};
export default GalleryYearNav;
