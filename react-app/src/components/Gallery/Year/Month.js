import React from "react";
import PropTypes from "prop-types";
import styled from "styled-components";
import { useTranslation } from "react-i18next";

import Link from "../Link";

import calendar from "../../../lib/calendar";
import format from "../../../lib/format";

const Root = styled.div`
  width: 214px;
  height: 238px;
  margin: 5px;
  border-style: solid;
  border-width: 1px;
  background-color: var(--none-color);
`;
const MonthTitle = styled.h3`
  color: var(--header-color);
  background: var(--header-background);
  font-size: 18pt;
  text-align: center;
  margin: 1px;
  padding: 5px 3px;
  border-style: solid;
  border-width: 1px;
  border-color: var(--header-background);

  display: block;
  width: 212px;
  height: 30px;
  padding: 0;
  margin: 0;
`;

const MonthContainer = styled.div`
  display: block;
  width: 100%;
  height: 180px;

  & :link {
    color: var(--primary-color);
  }
  & :visited {
    color: var(--primary-color);
  }
`;
const MonthGrid = styled.table`
  border-collapse: collapse;
  border-spacing: 0;
  white-space: nowrap;
  border-width: 1px;
  border-color: var(--none-color);
  border-style: solid;
`;
const Header = styled.thead``;
const Body = styled.tbody``;
const Row = styled.tr``;
const Cell = styled.td`
  border-width: 1px;
  border-color: var(--none-color);
  border-style: solid;
  padding: 0;
  margin: 0;
  height: 28px;
  width: 28px;
  overflow: hidden;
  display: inline-block;
  white-space: nowrap;
  text-align: center;
`;
const WeekDay = styled(Cell)`
  height: 20px;
  font-size: small;
  color: var(--inactive-color);
`;
const Day = styled(Cell)``;
const DayNone = styled(Cell)`
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

const Month = ({ gallery, year, month }) => {
  const { t } = useTranslation();

  const renderMonthTitle = (gallery, year, month) => {
    if (gallery.includesMonth(year, month)) {
      return (
        <Link gallery={gallery} year={year} month={month}>
          <MonthTitle>{month}</MonthTitle>
        </Link>
      );
    }
    return <MonthTitle>{month}</MonthTitle>;
  };
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
  const renderDayCell = (gallery, year, month, day, index) => {
    const photoCount = gallery.countPhotos(year, month, day);
    const heat = calculateHeat(photoCount);
    const title = `${format.date({
      year,
      month,
      day,
    })}: ${photoCount} photos`;
    if (photoCount === 0) {
      return (
        <DayNone key={index} title={title}>
          {renderDayValue(gallery, year, month, day, photoCount)}
        </DayNone>
      );
    }
    return (
      <Day key={index} className={`heat-${heat}`} title={title}>
        {renderDayValue(gallery, year, month, day, photoCount)}
      </Day>
    );
  };
  const renderMonthGrid = (gallery, year, month) => {
    return (
      <MonthContainer>
        <MonthGrid>
          <Header>
            <Row>
              {calendar.daysOfWeek().map((dow) => (
                <WeekDay key={dow}>{t(`weekday-short-${dow}`)}</WeekDay>
              ))}
            </Row>
          </Header>
          <Body>
            {calendar.monthGrid(year, month).map((row, rowIndex) => (
              <Row key={rowIndex}>
                {row.map((day, cellIndex) => {
                  return renderDayCell(gallery, year, month, day, cellIndex);
                })}
              </Row>
            ))}
          </Body>
        </MonthGrid>
      </MonthContainer>
    );
  };

  return (
    <Root>
      {renderMonthTitle(gallery, year, month)}
      {renderMonthGrid(gallery, year, month)}
    </Root>
  );
};
Month.propTypes = {
  gallery: PropTypes.object.isRequired,
  year: PropTypes.number.isRequired,
  month: PropTypes.number.isRequired,
};
export default Month;
