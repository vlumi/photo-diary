import React from "react";
import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";

import EpochAge from "./EpochAge";
import EpochDayIndex from "./EpochDayIndex";

import Thumbnails from "./Thumbnails";
import Link from "./Link";

import calendar from "../../lib/calendar";

const MonthContent = ({
  children,
  gallery,
  year,
  month,
  lang,
  countryData,
}) => {
  const { t } = useTranslation();

  if (!gallery.includesMonth(year, month)) {
    return <i>Empty</i>;
  }

  const renderEpochInfo = (day) => {
    if (!gallery.hasEpoch()) {
      return <></>;
    }
    switch (gallery.epochType()) {
      case "birthday":
        return (
          <span>
            <EpochAge gallery={gallery} year={year} month={month} day={day} />
          </span>
        );
      case "1-index":
        return (
          <span>
            <EpochDayIndex
              gallery={gallery}
              year={year}
              month={month}
              day={day}
              lang={lang}
            />
          </span>
        );
      case "0-index":
        return (
          <span>
            <EpochDayIndex
              gallery={gallery}
              year={year}
              month={month}
              day={day}
              lang={lang}
              start={0}
            />
          </span>
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
          <h3>
            {day}
            <span>
              {t(`weekday-short-${calendar.dayOfWeek(year, month, day)}`)}
            </span>
            {renderEpochInfo(day)}
          </h3>
        </Link>
      </Thumbnails>
    );
  };

  return (
    <>
      {children}
      <div className="month">{gallery.mapDays(year, month, renderDay)}</div>
    </>
  );
};
MonthContent.propTypes = {
  children: PropTypes.any,
  gallery: PropTypes.object.isRequired,
  year: PropTypes.number.isRequired,
  month: PropTypes.number.isRequired,
  lang: PropTypes.string.isRequired,
  countryData: PropTypes.object.isRequired,
};
export default MonthContent;
