import React from "react";
import PropTypes from "prop-types";
import styled from "styled-components";

import DayCell from "./DayCell";
import Link from "../Link";

import color from "../../../lib/color";
import format from "../../../lib/format";

// TODO: from configured theme
const heatColors = color.colorGradient("#ddf", "#99b", 11);

const Some = styled(DayCell)``;
const None = styled(DayCell)`
  color: var(--inactive-color);
`;

const Day = ({ gallery, year, month, day, maxCount }) => {
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
  const heatColor = heatColors[Math.round((photoCount * 10) / maxCount)];
  const style = {
    backgroundColor: heatColor,
  };
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
    <Some style={style} title={title}>
      {renderDayValue(gallery, year, month, day, photoCount)}
    </Some>
  );
};
Day.propTypes = {
  gallery: PropTypes.object.isRequired,
  year: PropTypes.number.isRequired,
  month: PropTypes.number.isRequired,
  day: PropTypes.number.isRequired,
  maxCount: PropTypes.number.isRequired,
};
export default Day;
