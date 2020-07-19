import React from "react";
import PropTypes from "prop-types";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

import calendar from "../utils/calendar";

const calculateHeat = (photos) => {
  if (photos < 1) return "none";
  if (photos < 2) return "low";
  if (photos < 5) return "medium";
  if (photos < 10) return "high";
  return "extreme";
};

const GalleryYearBody = ({ gallery, year }) => {
  const { t } = useTranslation();
  const produceMonthGrid = (month) => {
    const produceWeekRow = (row, rowIndex) => {
      const produceDayCell = (day, index) => {
        const photoCount = gallery.countPhotos(year, month, day);
        const heat = calculateHeat(photoCount);
        return (
          <td
            key={`day ${calendar.formatDate({
              year,
              month,
              day,
            })} ${row}:${index}`}
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

      return (
        <tr key={`grid ${calendar.formatDate({ year, month })} ${rowIndex}`}>
          {row.map((day, cellIndex) => {
            return produceDayCell(day, cellIndex);
          })}
        </tr>
      );
    };


    return (
      <div className="calendar-grid">
        <table>
          <thead>
            <tr>
              {calendar.daysOfWeek().map((dow) => (
                <th key={"head" + year + month + dow}>{t(`weekday-short-${dow}`)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {calendar
              .monthGrid(year, month)
              .map((row, index) => produceWeekRow(row, index))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <>
      {calendar.months().map((month) => (
        <div key={"calendar" + year + month} className="calendar">
          <div>
            <h3>
              {gallery.includesMonth(year, month) ? (
                <Link to={gallery.path(year, month)}>{month}</Link>
              ) : (
                month
              )}
            </h3>
            {produceMonthGrid(month)}
          </div>
        </div>
      ))}
    </>
  );
};
GalleryYearBody.propTypes = {
  gallery: PropTypes.object.isRequired,
  year: PropTypes.number.isRequired,
};
export default GalleryYearBody;
