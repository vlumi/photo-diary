import React from "react";
import PropTypes from "prop-types";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

import GalleryTitle from "./GalleryTitle";

import calendar from "../utils/calendar";

const calculateHeat = (photos) => {
  if (photos < 1) return "none";
  if (photos < 2) return "low";
  if (photos < 5) return "medium";
  if (photos < 10) return "high";
  return "extreme";
};

const GalleryYearContent = ({ gallery, year }) => {
  const { t } = useTranslation();

  const renderMonthTitle = (gallery, year, month) => {
    if (gallery.includesMonth(year, month)) {
      return (
        <Link to={gallery.path(year, month)}>
          <h3>{month}</h3>
        </Link>
      );
    }
    return <h3>month</h3>;
  };
  const renderDayValue = (gallery, year, month, day, photoCount) => {
    if (day === 0) {
      return <></>;
    }
    if (photoCount > 0) {
      return (
        <Link
          to={gallery.path(year, month, day)}
          title={`${calendar.formatDate({
            year,
            month,
            day,
          })}: ${photoCount} photos`}
        >
          {day}
        </Link>
      );
    }
    return day;
  };
  const renderDayCell = (gallery, year, month, day, index) => {
    const photoCount = gallery.countPhotos(year, month, day);
    const heat = calculateHeat(photoCount);
    return (
      <td
        key={["td", year, month, day, index].join("-")}
        className={`heat-${heat}`}
      >
        {renderDayValue(gallery, year, month, day, photoCount)}
      </td>
    );
  };
  const renderWeekRow = (gallery, year, month, row, rowIndex) => {
    return (
      <tr key={["tr", year, month, rowIndex].join("-")}>
        {row.map((day, cellIndex) => {
          return renderDayCell(gallery, year, month, day, cellIndex);
        })}
      </tr>
    );
  };
  const renderMonthGrid = (gallery, year, month) => {
    return (
      <div className="calendar-grid">
        <table>
          <thead>
            <tr>
              {calendar.daysOfWeek().map((dow) => (
                <th key={["th", year, month, dow].join("-")}>
                  {t(`weekday-short-${dow}`)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {calendar
              .monthGrid(year, month)
              .map((row, index) =>
                renderWeekRow(gallery, year, month, row, index)
              )}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <>
      <GalleryTitle gallery={gallery} />
      <div className="year">
        <div className="calendars">
          {calendar
            .months(year, ...gallery.firstMonth(), ...gallery.lastMonth())
            .map((month) => (
              <div key={["cal", year, month].join("-")} className="calendar">
                {renderMonthTitle(gallery, year, month)}
                {renderMonthGrid(gallery, year, month)}
              </div>
            ))}
        </div>
      </div>
    </>
  );
};
GalleryYearContent.propTypes = {
  gallery: PropTypes.object.isRequired,
  year: PropTypes.number.isRequired,
};
export default GalleryYearContent;
