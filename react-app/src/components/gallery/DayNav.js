import React from "react";
import PropTypes from "prop-types";

import DateLink from "../DateLink";

import Link from "./Link";

const DayNav = ({ gallery, year, month, day }) => {
  const prevStyle = gallery.isFirstDay(year, month, day)
    ? { visibility: "hidden" }
    : {};
  const nextStyle = gallery.isLastDay(year, month, day)
    ? { visibility: "hidden" }
    : {};

  const [firstYear, firstMonth, firstDay] = gallery.firstDay();
  const [previousYear, previousMonth, previousDay] = gallery.previousDay(
    year,
    month,
    day
  );
  const [nextYear, nextMonth, nextDay] = gallery.nextDay(year, month, day);
  const [lastYear, lastMonth, lastDay] = gallery.lastDay();
  return (
    <h2>
      <Link
        gallery={gallery}
        year={firstYear}
        month={firstMonth}
        day={firstDay}
      >
        <span style={prevStyle}>⇤</span>
      </Link>
      <Link
        gallery={gallery}
        year={previousYear}
        month={previousMonth}
        day={previousDay}
      >
        <span style={prevStyle}>←</span>
      </Link>
      <DateLink gallery={gallery} year={year} month={month} day={day} />
      <Link
        gallery={gallery}
        year={nextYear}
        month={nextMonth}
        day={nextDay}
      >
        <span style={nextStyle}>→</span>
      </Link>
      <Link
        gallery={gallery}
        year={lastYear}
        month={lastMonth}
        day={lastDay}
      >
        <span style={nextStyle}>⇥</span>
      </Link>
    </h2>
  );
};
DayNav.propTypes = {
  gallery: PropTypes.object.isRequired,
  year: PropTypes.number.isRequired,
  month: PropTypes.number.isRequired,
  day: PropTypes.number.isRequired,
};
export default DayNav;
