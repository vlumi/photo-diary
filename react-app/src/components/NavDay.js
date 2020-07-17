import React from "react";
import PropTypes from "prop-types";

import DateLink from "./DateLink";
import GalleryLink from "./GalleryLink";

import calendar from "../utils/calendar";

const NavDay = ({ gallery, year, month, day }) => {
  const prevStyle = calendar.isFirstYearMonthDay(gallery, year, month, day)
    ? { visibility: "hidden" }
    : {};
  const nextStyle = calendar.isLastYearMonthDay(gallery, year, month, day)
    ? { visibility: "hidden" }
    : {};

  const [firstYear, firstMonth, firstDay] = calendar.firstYearMonthDay(gallery);
  const [previousYear, previousMonth, previousDay] = calendar.previousYearMonthDay(
    gallery,
    year,
    month,
    day
  );
  const [nextYear, nextMonth, nextDay] = calendar.nextYearMonthDay(
    gallery,
    year,
    month,
    day
  );
  const [lastYear, lastMonth, lastDay] = calendar.lastYearMonthDay(gallery);
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
