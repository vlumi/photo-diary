import React from "react";
import PropTypes from "prop-types";
import { Redirect } from "react-router-dom";

import GalleryTitle from "./GalleryTitle";
import GalleryMonthNav from "./GalleryMonthNav";
import GalleryMonthBody from "./GalleryMonthBody";

import useKeyPress from "../utils/keypress";

const GalleryMonth = ({ gallery, year, month }) => {
  const [redirect, setRedirect] = React.useState(undefined);

  useKeyPress("Escape", () => {
    window.history.pushState({}, "");
    setRedirect(gallery.path(year));
  });
  useKeyPress("Home", () => {
    window.history.pushState({}, "");
    setRedirect(gallery.path(...gallery.firstMonth()));
  });
  useKeyPress("ArrowLeft", () => {
    if (!gallery.isFirstMonth(year, month)) {
      window.history.pushState({}, "");
      setRedirect(gallery.path(...gallery.previousMonth(year, month)));
    }
  });
  useKeyPress("ArrowRight", () => {
    if (!gallery.isLastMonth(year, month)) {
      window.history.pushState({}, "");
      setRedirect(gallery.path(...gallery.nextMonth(year, month)));
    }
  });
  useKeyPress("End", () => {
    window.history.pushState({}, "");
    setRedirect(gallery.path(...gallery.lastMonth()));
  });

  if (redirect) {
    setTimeout(() => setRedirect(""), 0);
    return <Redirect to={redirect} />;
  }

  if (!gallery.includesMonth(year, month)) {
    return (
      <p>
        <GalleryMonthNav gallery={gallery} year={year} month={month} />
        <GalleryTitle gallery={gallery} />
        <i>Empty</i>
      </p>
    );
  }

  return (
    <>
      <GalleryMonthNav gallery={gallery} year={year} month={month} />
      <div className="content month">
        <GalleryTitle gallery={gallery} />
        <GalleryMonthBody gallery={gallery} year={year} month={month} />
      </div>
    </>
  );
};
GalleryMonth.propTypes = {
  gallery: PropTypes.object.isRequired,
  year: PropTypes.number.isRequired,
  month: PropTypes.number.isRequired,
};
export default GalleryMonth;
