import React from "react";
import PropTypes from "prop-types";
import { Link } from "react-router-dom";

import calendar from "../utils/calendar";

const calculateHeat = (photos) => {
  if (photos < 1) return "none";
  if (photos < 2) return "low";
  if (photos < 5) return "medium";
  if (photos < 10) return "high";
  return "extreme";
};

const BodyYear = ({ gallery, year }) => {
  const produceMonthGrid = (month) => {
    const produceWeekRow = (row, rowIndex) => {
      const produceDayCell = (day, index) => {
        const photoCount =
          year in gallery.photos &&
          month in gallery.photos[year] &&
          day in gallery.photos[year][month]
            ? gallery.photos[year][month][day].length
            : 0;
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
                to={`/g/${gallery.id}/${year}/${month}/${day}`}
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
              {calendar.getDaysOfWeek().map((dow) => (
                <th key={"head" + year + month + dow}>{dow}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {calendar
              .getMonthGrid(year, month)
              .map((row, index) => produceWeekRow(row, index))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <>
      {calendar.getMonths().map((month) => (
        <div key={"calendar" + year + month} className="calendar">
          <div>
            <h3>
              {year in gallery.photos && month in gallery.photos[year] ? (
                <Link to={`/g/${gallery.id}/${year}/${month}`}>{month}</Link>
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
BodyYear.propTypes = {
  gallery: PropTypes.object.isRequired,
  year: PropTypes.number.isRequired,
};
export default BodyYear;
