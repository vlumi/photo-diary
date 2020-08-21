import React from "react";
import PropTypes from "prop-types";
import styled from "styled-components";
import { useTranslation } from "react-i18next";

import Day from "./Day";
import DayCell from "./DayCell";
import Link from "../Link";

import calendar from "../../../lib/calendar";

const Root = styled.div`
  width: 214px;
  height: 238px;
  margin: 5px;
  border-style: solid;
  border-width: 1px;
  border-radius: 10px;
  background-color: var(--header-color);
  overflow: hidden;
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
  width: 100%;
  padding: 2px 0;
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
  border-color: var(--header-color);
  border-style: solid;
`;
const Header = styled.thead``;
const Body = styled.tbody``;
const Row = styled.tr``;
const WeekDay = styled(DayCell)`
  height: 20px;
  font-size: small;
  color: var(--inactive-color);
`;

const Month = ({ gallery, year, month, maxCount,theme }) => {
  const { t } = useTranslation();

  const renderTitle = (gallery, year, month) => {
    if (gallery.includesMonth(year, month)) {
      return (
        <Link gallery={gallery} year={year} month={month}>
          <MonthTitle>{month}</MonthTitle>
        </Link>
      );
    }
    return <MonthTitle>{month}</MonthTitle>;
  };

  return (
    <Root>
      {renderTitle(gallery, year, month)}
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
                {row.map((day, cellIndex) => (
                  <Day
                    key={cellIndex}
                    gallery={gallery}
                    year={year}
                    month={month}
                    day={day}
                    maxCount={maxCount}
                    theme={theme}
                  />
                ))}
              </Row>
            ))}
          </Body>
        </MonthGrid>
      </MonthContainer>
    </Root>
  );
};
Month.propTypes = {
  gallery: PropTypes.object.isRequired,
  year: PropTypes.number.isRequired,
  month: PropTypes.number.isRequired,
  maxCount: PropTypes.number.isRequired,
  theme: PropTypes.object.isRequired,
};
export default Month;
