import React from "react";
import { Link } from "react-router-dom";
import PropTypes from "prop-types";

const DumpPhotoNames = ({ gallery, year, month, day }) => {
  const processDay = (year, month, day) => {
    return (
      <li key={year * 10000 + month * 100 + day}>
        <Link to={`/g/${gallery.id}/${year}/${month}/${day}`}>{day}</Link>
        {day in gallery.photos[year][month] ? (
          <ul>
            {gallery.photos[year][month][day].map((photo) => {
              return <li key={photo.id}>{photo.id}</li>;
            })}
          </ul>
        ) : (
          <div>No photos</div>
        )}
      </li>
    );
  };
  const processMonth = (year, month) => {
    const eachDay = (year, month) => {
      return Object.keys(gallery.photos[year][month])
        .sort((a, b) => a - b)
        .map((day) => {
          return processDay(year, month, day);
        });
    };
    return (
      <li key={year * 100 + month}>
        <Link to={`/g/${gallery.id}/${year}/${month}`}>{month}</Link>
        {month in gallery.photos[year] ? (
          <ul>{day ? processDay(year, month, day) : eachDay(year, month)}</ul>
        ) : (
          <div>No photos</div>
        )}
      </li>
    );
  };
  const processYear = (year) => {
    const eachMonth = (year) => {
      return Object.keys(gallery.photos[year])
        .sort((a, b) => a - b)
        .map((month) => {
          return processMonth(year, month);
        });
    };
    return (
      <li key={year}>
        <Link to={`/g/${gallery.id}/${year}`}>{year}</Link>
        {year in gallery.photos ? (
          <ul>{month ? processMonth(year, month) : eachMonth(year)}</ul>
        ) : (
          <div>No photos</div>
        )}
      </li>
    );
  };
  const process = () => {
    const eachYear = () => {
      return Object.keys(gallery.photos)
        .sort((a, b) => a - b)
        .map((year) => processYear(year));
    };
    return <ul>{year ? processYear(year) : eachYear()}</ul>;
  };
  return (
    <>
      <div>
        <Link to={`/g/${gallery.id}`}>Photos</Link>
      </div>
      {process()}
    </>
  );
};
DumpPhotoNames.propTypes = {
  gallery: PropTypes.object.isRequired,
  year: PropTypes.number,
  month: PropTypes.number,
  day: PropTypes.number,
};
export default DumpPhotoNames;
