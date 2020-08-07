import React from "react";
import PropTypes from "prop-types";
import styled from "styled-components";
import { useTranslation } from "react-i18next";

import EpochAge from "../EpochAge";
import EpochDayIndex from "../EpochDayIndex";

import Thumbnails from "../Thumbnails";
import Link from "../Link";

import calendar from "../../../lib/calendar";

const Root = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-start;
`;
const DayTitle = styled.h3`
  color: var(--header-color);
  background: var(--header-background);
  font-size: 18pt;
  text-align: center;
  margin: 1px;
  padding: 5px 3px;
  border-style: solid;
  border-width: 1px;
  border-color: var(--header-background);
  border-radius: 15px 0 0 15px;
  height: 200px;
  min-width: 25px;
`;
const DaySubTitle = styled.span`
  display: block;
  font-size: 8pt;
  margin: 0;
  color: var(--header-sub-color);
  background: inherit;
  margin: 5px 0;
`;

const Content = ({ children, gallery, year, month, lang, countryData }) => {
  const { t } = useTranslation();

  if (!gallery.includesMonth(year, month)) {
    return (
      <>
        {children}
        <i>Empty</i>
      </>
    );
  }

  const renderEpochInfo = (day) => {
    if (!gallery.hasEpoch()) {
      return <></>;
    }
    switch (gallery.epochType()) {
      case "birthday":
        return (
          <DaySubTitle>
            <EpochAge gallery={gallery} year={year} month={month} day={day} />
          </DaySubTitle>
        );
      case "1-index":
        return (
          <DaySubTitle>
            <EpochDayIndex
              gallery={gallery}
              year={year}
              month={month}
              day={day}
              lang={lang}
            />
          </DaySubTitle>
        );
      case "0-index":
        return (
          <DaySubTitle>
            <EpochDayIndex
              gallery={gallery}
              year={year}
              month={month}
              day={day}
              lang={lang}
              start={0}
            />
          </DaySubTitle>
        );
      default:
        return "";
    }
  };

  const renderDay = (day) => {
    return (
      <Thumbnails
        key={"" + year + month + day}
        gallery={gallery}
        photos={gallery.photos(year, month, day)}
        lang={lang}
        countryData={countryData}
      >
        <Link gallery={gallery} year={year} month={month} day={day}>
          <DayTitle>
            {day}
            <DaySubTitle>
              {t(`weekday-short-${calendar.dayOfWeek(year, month, day)}`)}
            </DaySubTitle>
            {renderEpochInfo(day)}
          </DayTitle>
        </Link>
      </Thumbnails>
    );
  };

  return (
    <>
      {children}
      <Root>{gallery.mapDays(year, month, renderDay)}</Root>
    </>
  );
};
Content.propTypes = {
  children: PropTypes.any,
  gallery: PropTypes.object.isRequired,
  year: PropTypes.number.isRequired,
  month: PropTypes.number.isRequired,
  lang: PropTypes.string.isRequired,
  countryData: PropTypes.object.isRequired,
};
export default Content;
