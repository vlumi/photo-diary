import React from "react";
import PropTypes from "prop-types";

import DateLink from "./DateLink";
import GalleryLink from "./GalleryLink";

import calendar from "../utils/calendar";

const NavYear = ({ gallery, year }) => {
  const prevStyle = calendar.isFirstYear(gallery, year)
    ? { visibility: "hidden" }
    : {};
  const nextStyle = calendar.isLastYear(gallery, year)
    ? { visibility: "hidden" }
    : {};

  const firstYear = calendar.firstYear(gallery);
  const previousYear = calendar.previousYear(gallery, year);
  const nextYear = calendar.nextYear(gallery, year);
  const lastYear = calendar.lastYear(gallery);
  return (
    <h2>
      <span title="First year" style={prevStyle}>
        <GalleryLink gallery={gallery} year={firstYear}>
          ⇤
        </GalleryLink>
      </span>
      <span title="Previous year" style={prevStyle}>
        <GalleryLink gallery={gallery} year={previousYear}>
          ←
        </GalleryLink>
      </span>
      <span className="title">
        <DateLink gallery={gallery} year={year} />
      </span>
      <span title="Next year" style={nextStyle}>
        <GalleryLink gallery={gallery} year={nextYear}>
          →
        </GalleryLink>
      </span>
      <span title="Last year" style={nextStyle}>
        <GalleryLink gallery={gallery} year={lastYear}>
          ⇥
        </GalleryLink>
      </span>
    </h2>
  );
};
NavYear.propTypes = {
  gallery: PropTypes.object.isRequired,
  year: PropTypes.number.isRequired,
};
export default NavYear;
