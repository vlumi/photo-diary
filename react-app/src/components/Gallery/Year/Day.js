import React from "react";
import PropTypes from "prop-types";
import styled from "styled-components";

import DayCell from "./DayCell";
import Link from "../Link";

import format from "../../../lib/format";

const Some = styled(DayCell)``;
const None = styled(DayCell)`
  color: var(--inactive-color);
`;

const calculateHeat = (photos) => {
  // TODO: make dynamic based on actual values, with color gradients
  if (photos < 1) return "none";
  if (photos < 2) return "low";
  if (photos < 5) return "medium";
  if (photos < 10) return "high";
  return "extreme";
};

const Day = ({ gallery, year, month, day }) => {
  const renderDayValue = (gallery, year, month, day, photoCount) => {
    if (day === 0) {
      return <></>;
    }
    if (photoCount > 0) {
      return (
        <Link gallery={gallery} year={year} month={month} day={day}>
          {day}
        </Link>
      );
    }
    return day;
  };

  const photoCount = gallery.countPhotos(year, month, day);
  const heat = calculateHeat(photoCount);
  const title = `${format.date({
    year,
    month,
    day,
  })}: ${photoCount} photos`;
  if (photoCount === 0) {
    return (
      <None title={title}>
        {renderDayValue(gallery, year, month, day, photoCount)}
      </None>
    );
  }
  return (
    <Some className={`heat-${heat}`} title={title}>
      {renderDayValue(gallery, year, month, day, photoCount)}
    </Some>
  );
};
Day.propTypes = {
  gallery: PropTypes.object.isRequired,
  year: PropTypes.number.isRequired,
  month: PropTypes.number.isRequired,
  day: PropTypes.number.isRequired,
};
export default Day;
