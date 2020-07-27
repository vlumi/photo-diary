import React from "react";
import PropTypes from "prop-types";

import DateLink from "../DateLink";

import Link from "./Link";

const YearNav = ({ gallery, year }) => {
  const prevStyle = gallery.isFirstYear(year) ? { visibility: "hidden" } : {};
  const nextStyle = gallery.isLastYear(year) ? { visibility: "hidden" } : {};

  const firstYear = gallery.firstYear();
  const previousYear = gallery.previousYear(year);
  const nextYear = gallery.nextYear(year);
  const lastYear = gallery.lastYear();
  return (
    <h2>
      <Link gallery={gallery} year={firstYear}>
        <span style={prevStyle}>⇤</span>
      </Link>
      <Link gallery={gallery} year={previousYear}>
        <span style={prevStyle}>←</span>
      </Link>
      <DateLink gallery={gallery} year={year} />
      <Link gallery={gallery} year={nextYear}>
        <span style={nextStyle}>→</span>
      </Link>
      <Link gallery={gallery} year={lastYear}>
        <span style={nextStyle}>⇥</span>
      </Link>
    </h2>
  );
};
YearNav.propTypes = {
  gallery: PropTypes.object.isRequired,
  year: PropTypes.number.isRequired,
};
export default YearNav;
