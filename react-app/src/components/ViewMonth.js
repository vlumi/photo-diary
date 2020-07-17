import React from "react";
import PropTypes from "prop-types";
import { Link } from "react-router-dom";

import Photos from "./Photos";
import DateLink from "./DateLink";

const ViewMonth = ({ gallery, year, month }) => (
  <>
    <div className="month">
      <h2 className="month_nav">
        <span className="nav first" title="First month">
          |&lt;&lt;
        </span>
        <span className="nav prev" title="Previous month">
          &lt;&lt;
        </span>
        <span className="title">
          <DateLink gallery={gallery} year={year} month={month} />
        </span>
        <span className="nav next" title="Next month">
          &gt;&gt;
        </span>
        <span className="nav last" title="Last month">
          &gt;&gt;|
        </span>
      </h2>
      <div>
        {Object.keys(gallery.photos[year][month]).map((day) => {
          return (
            <Photos
              key={"" + year + month + day}
              photos={gallery.photos[year][month][day]}
            >
              <h3>
                <Link to={`/g/${gallery.id}/${year}/${month}/${day}`}>
                  {day}
                </Link>
              </h3>
            </Photos>
          );
        })}
      </div>
      <h2 className="month_nav">
        <span className="nav first" title="First month">
          |&lt;&lt;
        </span>
        <span className="nav prev" title="Previous month">
          &lt;&lt;
        </span>
        <span className="title">
          <DateLink gallery={gallery} year={year} month={month} />
        </span>
        <span className="nav next" title="Next month">
          &gt;&gt;
        </span>
        <span className="nav last" title="Last month">
          &gt;&gt;|
        </span>
      </h2>
    </div>
  </>
);
ViewMonth.propTypes = {
  gallery: PropTypes.object.isRequired,
  year: PropTypes.number.isRequired,
  month: PropTypes.number.isRequired,
};
export default ViewMonth;
