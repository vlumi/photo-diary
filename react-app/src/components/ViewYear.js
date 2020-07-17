import React from "react";
import PropTypes from "prop-types";
import { Link } from "react-router-dom";

import NavYear from "./NavYear";

import calendar from "../utils/calendar";

const calculateHeat = (photos) => {
  if (photos < 1) return "none";
  if (photos < 2) return "low";
  if (photos < 5) return "medium";
  if (photos < 10) return "high";
  return "extreme";
};

const ViewYear = ({ gallery, year }) => {
  const produceMonthGrid = (month) => {
    const produceWeekRow = (row, index) => {
      const produceDayCell = (day) => {
        const photoCount =
          year in gallery.photos &&
          month in gallery.photos[year] &&
          day in gallery.photos[year][month]
            ? gallery.photos[year][month][day].length
            : 0;
        const heat = calculateHeat(photoCount);
        return (
          <td
            key={"day" + year + month + index + day}
            className={`heat-${heat}`}
          >
            {day === 0 ? (
              <></>
            ) : photoCount > 0 ? (
              <Link
                key={"" + year + month + day}
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
        <tr key={"grid" + year + month + index}>
          {row.map((day, index) => {
            return produceDayCell(day, index);
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

  const produceYearGrid = () => (
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

  return (
    <div className="year">
      <NavYear gallery={gallery} year={year} />
      {produceYearGrid()}
      <NavYear gallery={gallery} year={year} />
    </div>
  );
};
ViewYear.propTypes = {
  gallery: PropTypes.object.isRequired,
  year: PropTypes.number.isRequired,
};
export default ViewYear;
