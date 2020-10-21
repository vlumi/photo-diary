import React from "react";
import PropTypes from "prop-types";
import styled from "styled-components";
import { useTranslation } from "react-i18next";

import DayCell from "./DayCell";
import Link from "../Link";

import color from "../../../lib/color";
import format from "../../../lib/format";

const Some = styled(DayCell)``;
const None = styled(DayCell)`
  color: var(--inactive-color);
`;

const cachedHeatColors = {
  from: undefined,
  to: undefined,
  values: [],
};
const getHeatColors = (theme) => {
  const gradientFrom = theme.get("primary-background");
  const gradientTo = theme.get("inactive-color");
  if (
    cachedHeatColors.from === gradientFrom &&
    cachedHeatColors.to === gradientTo
  ) {
    return cachedHeatColors.values;
  }
  cachedHeatColors.from = gradientFrom;
  cachedHeatColors.to = gradientTo;
  cachedHeatColors.values = color.colorGradient(gradientFrom, gradientTo, 11);
  return cachedHeatColors.values;
};

const Day = ({ gallery, year, month, day, maxCount, theme }) => {
  const heatColors = getHeatColors(theme);

  const { t } = useTranslation();

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
  })}: ${t("photo-count", {
    count: photoCount,
  })}`;
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
  theme: PropTypes.object.isRequired,
};
export default Day;
