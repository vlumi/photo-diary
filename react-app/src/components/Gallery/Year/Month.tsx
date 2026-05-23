import React from "react";
import styled from "@emotion/styled";
import { useTranslation } from "react-i18next";

import Day from "./Day";
import DayCell from "./DayCell";
import Link from "../Link";

import calendar from "../../../lib/calendar";

import type { Gallery } from "../../../models/GalleryModel";

type ActiveTheme = { get: (name: string) => string };

// The whole month tile is wrapped in a single Link to the Month view
// (closes #274) — the previous per-day Links in [Day.tsx](./Day.tsx) are
// gone, so this is the only navigation surface out of the Year view.
// `display: block` so the inline `<a>` lays out as a tile, and
// `color: inherit; text-decoration: none` so the wrapped content keeps
// the existing visual styling rather than picking up the browser's
// default link styling.
const MonthLink = styled(Link)`
  display: block;
  color: inherit;
  text-decoration: none;
`;
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
`;
const MonthGrid = styled.table`
  border-collapse: collapse;
  border-spacing: 0;
  white-space: nowrap;
  border-width: 1px;
  border-color: var(--header-color);
  border-style: solid;
  margin: auto;
`;
const Header = styled.thead``;
const Body = styled.tbody``;
const Row = styled.tr``;
const WeekDay = styled(DayCell)`
  height: 20px;
  font-size: small;
  color: var(--inactive-color);
`;

interface Props {
  gallery: Gallery;
  year: number;
  month: number;
  maxCount: number;
  theme: ActiveTheme;
}

const Month = ({
  gallery,
  year,
  month,
  maxCount,
  theme,
}: Props): React.ReactElement => {
  const { t } = useTranslation();

  const tile = (
    <Root>
      <MonthTitle>{month}</MonthTitle>
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

  if (gallery.includesMonth(year, month)) {
    return (
      <MonthLink gallery={gallery} year={year} month={month}>
        {tile}
      </MonthLink>
    );
  }
  return tile;
};
export default Month;
