import React from "react";
import PropTypes from "prop-types";

import DateLink from "../DateLink";

import Link from "./Link";

const MonthNav = ({ gallery, year, month }) => {
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
      <Link gallery={gallery} year={firstYear} month={firstMonth}>
        <span style={prevStyle}>⇤</span>
      </Link>
      <Link gallery={gallery} year={previousYear} month={previousMonth}>
        <span style={prevStyle}>←</span>
      </Link>
      <DateLink gallery={gallery} year={year} month={month}></DateLink>
      <Link gallery={gallery} year={nextYear} month={nextMonth}>
        <span style={nextStyle}>→</span>
      </Link>
      <Link gallery={gallery} year={lastYear} month={lastMonth}>
        <span style={nextStyle}>⇥</span>
      </Link>
    </h2>
  );
};
MonthNav.propTypes = {
  gallery: PropTypes.object.isRequired,
  year: PropTypes.number.isRequired,
  month: PropTypes.number.isRequired,
};
export default MonthNav;
