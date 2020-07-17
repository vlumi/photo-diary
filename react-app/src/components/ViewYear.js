import React from "react";
import PropTypes from "prop-types";
import { Link } from "react-router-dom";

import DateLink from "./DateLink";

import cal from "../utils/calendar";
console.log(cal.getMonths());

const ViewYear = ({ gallery, year }) => {
  console.log(gallery.photos);
  return (
    <div className="year">
      <h2 className="year_nav">
        <span className="nav first" title="First year">
          |&lt;&lt;
        </span>
        <span className="nav prev" title="Previous year">
          &lt;&lt;
        </span>
        <span className="title">
          <DateLink gallery={gallery} year={year} />
        </span>
        <span className="nav next" title="Next year">
          &gt;&gt;
        </span>
        <span className="nav last" title="Last year">
          &gt;&gt;|
        </span>
      </h2>
      <>
        {cal.getMonths().map((month) => (
          <div key={"" + year + month} className="calendar">
            <div>
              <h3>
                {month in gallery.photos[year] ? (
                  <Link to={`/g/${gallery.id}/${year}/${month}`}>{month}</Link>
                ) : (
                  month
                )}
              </h3>
              <div className="calendar-grid">
                <table>
                  <thead>
                    <tr>
                      {cal.getDaysOfWeek().map((dow) => (
                        <th key={"" + year + month + dow}>{dow}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {cal.getMonthGrid(year, month).map((row, index) => (
                      <tr key={"" + year + month + index}>
                        {row.map((day) => {
                          const photos =
                            month in gallery.photos[year] &&
                            day in gallery.photos[year][month]
                              ? gallery.photos[year][month][day].length
                              : 0;
                          const heat =
                            photos < 1
                              ? "none"
                              : photos < 2
                                ? "low"
                                : photos < 5
                                  ? "medium"
                                  : photos < 10
                                    ? "high"
                                    : "extreme";
                          return (
                            <td
                              key={"" + year + month + day}
                              className={`heat-${heat}`}
                            >
                              {day === 0 ? (
                                <></>
                              ) : photos > 0 ? (
                                <Link
                                  key={"" + year + month + day}
                                  to={`/g/${gallery.id}/${year}/${month}/${day}`}
                                >
                                  {day}
                                </Link>
                              ) : (
                                day
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {/* {cal.getMonthDays(year, month).map((day) => (
                  <span>
                    {month in gallery.photos[year] &&
                    day in gallery.photos[year][month] ? (
                      <Link
                        key={"" + year + month + day}
                        to={`/g/${gallery.id}/${year}/${month}/${day}`}
                      >
                        {day}
                      </Link>
                    ) : (
                      day
                    )}
                  </span>
                ))} */}
              </div>
            </div>
          </div>
        ))}
      </>
    </div>
  );
};
ViewYear.propTypes = {
  gallery: PropTypes.object.isRequired,
  year: PropTypes.number.isRequired,
};
export default ViewYear;
