import React from "react";
import PropTypes from "prop-types";

import DateLink from "./DateLink";
import GalleryLink from "./GalleryLink";

const NavDay = ({ gallery, year, month, day }) => {
  const prevStyle = gallery.isFirstDay(year, month, day)
    ? { visibility: "hidden" }
    : {};
  const nextStyle = gallery.isLastDay(year, month, day)
    ? { visibility: "hidden" }
    : {};

  const [firstYear, firstMonth, firstDay] = gallery.firstDay();
  const [
    previousYear,
    previousMonth,
    previousDay,
  ] = gallery.previousDay(year, month, day);
  const [nextYear, nextMonth, nextDay] = gallery.nextDay(
    year,
    month,
    day
  );
  const [lastYear, lastMonth, lastDay] = gallery.lastDay();
  return (
    <h2>
      <span title="First day" style={prevStyle}>
        <GalleryLink
          gallery={gallery}
          year={firstYear}
          month={firstMonth}
          day={firstDay}
        >
          ⇤
        </GalleryLink>
      </span>
      <span title="Previous day" style={prevStyle}>
        <GalleryLink
          gallery={gallery}
          year={previousYear}
          month={previousMonth}
          day={previousDay}
        >
          ←
        </GalleryLink>
      </span>
      <span className="title">
        <DateLink gallery={gallery} year={year} month={month} day={day} />
      </span>
      <span title="Next day" style={nextStyle}>
        <GalleryLink
          gallery={gallery}
          year={nextYear}
          month={nextMonth}
          day={nextDay}
        >
          →
        </GalleryLink>
      </span>
      <span title="Last day" style={nextStyle}>
        <GalleryLink
          gallery={gallery}
          year={lastYear}
          month={lastMonth}
          day={lastDay}
        >
          ⇥
        </GalleryLink>
      </span>
    </h2>
  );
};
NavDay.propTypes = {
  gallery: PropTypes.object.isRequired,
  year: PropTypes.number.isRequired,
  month: PropTypes.number.isRequired,
  day: PropTypes.number.isRequired,
};
export default NavDay;
