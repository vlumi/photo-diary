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
GalleryMonthNav.propTypes = {
  gallery: PropTypes.object.isRequired,
  year: PropTypes.number.isRequired,
  month: PropTypes.number.isRequired,
};
export default GalleryMonthNav;
