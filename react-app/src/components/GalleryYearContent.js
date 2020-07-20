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

  const renderDayCell = (year, month, day, index) => {
    const photoCount = gallery.countPhotos(year, month, day);
    const heat = calculateHeat(photoCount);
    return (
      <td
        key={`day ${calendar.formatDate({
          year,
          month,
          day,
        })} ${index}`}
        className={`heat-${heat}`}
      >
        {day === 0 ? (
          <></>
        ) : photoCount > 0 ? (
          <Link
            key={`${calendar.formatDate({ year, month, day })}`}
            to={gallery.path(year, month, day)}
            title={`${calendar.formatDate({
              year,
              month,
              day,
            })}: ${photoCount} photos`}
          >
            {day}
          </Link>
        ) : (
          day
        )}
      </td>
    );
  };

  const renderWeekRow = (year, month, row, rowIndex) => {
    return (
      <tr key={`grid ${calendar.formatDate({ year, month })} ${rowIndex}`}>
        {row.map((day, cellIndex) => {
          return renderDayCell(year, month, day, cellIndex);
        })}
      </tr>
    );
  };
  const renderMonthGrid = (month) => {
    return (
      <div className="calendar-grid">
        <table>
          <thead>
            <tr>
              {calendar.daysOfWeek().map((dow) => (
                <th key={"head" + year + month + dow}>
                  {t(`weekday-short-${dow}`)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {calendar
              .monthGrid(year, month)
              .map((row, index) => renderWeekRow(year, month, row, index))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="content">
      <GalleryTitle gallery={gallery} />
      <div className="year">
        <div className="calendars">
          {calendar
            .months(year, ...gallery.firstMonth(), ...gallery.lastMonth())
            .map((month) => (
              <div key={"calendar" + year + month} className="calendar">
                {gallery.includesMonth(year, month) ? (
                  <Link to={gallery.path(year, month)}>
                    <h3>{month}</h3>
                  </Link>
                ) : (
                  <h3>month</h3>
                )}
                {renderMonthGrid(month)}
              </div>
            ))}
        </div>
      </div>
    </div>
  );
};
GalleryYearContent.propTypes = {
  gallery: PropTypes.object.isRequired,
  year: PropTypes.number.isRequired,
};
export default GalleryYearContent;
