import React from "react";
import PropTypes from "prop-types";

import DateLink from "./DateLink";
import GalleryLink from "./GalleryLink";

const NavMonth = ({ gallery, year, month }) => {
  const prevStyle = gallery.isFirstYearMonth(year, month)
    ? { visibility: "hidden" }
    : {};
  const nextStyle = gallery.isLastYearMonth(year, month)
    ? { visibility: "hidden" }
    : {};

  const [firstYear, firstMonth] = gallery.firstYearMonth();
  const [previousYear, previousMonth] = gallery.previousYearMonth(year, month);
  const [nextYear, nextMonth] = gallery.nextYearMonth(year, month);
  const [lastYear, lastMonth] = gallery.lastYearMonth();
  return (
    <h2>
      <span title="First month" style={prevStyle}>
        <GalleryLink gallery={gallery} year={firstYear} month={firstMonth}>
          ⇤
        </GalleryLink>
      </span>
      <span title="Previous month" style={prevStyle}>
        <GalleryLink
          gallery={gallery}
          year={previousYear}
          month={previousMonth}
        >
          ←
        </GalleryLink>
      </span>
      <span className="title">
        <DateLink gallery={gallery} year={year} month={month} />
      </span>
      <span title="Next month" style={nextStyle}>
        <GalleryLink gallery={gallery} year={nextYear} month={nextMonth}>
          →
        </GalleryLink>
      </span>
      <span title="Last month" style={nextStyle}>
        <GalleryLink gallery={gallery} year={lastYear} month={lastMonth}>
          ⇥
        </GalleryLink>
      </span>
    </h2>
  );
};
NavMonth.propTypes = {
  gallery: PropTypes.object.isRequired,
  year: PropTypes.number.isRequired,
  month: PropTypes.number.isRequired,
};
export default NavMonth;
