import React from "react";
import PropTypes from "prop-types";
import { Redirect } from "react-router-dom";

import GalleryDayNav from "./GalleryDayNav";
import GalleryDayBody from "./GalleryDayBody";

import useKeyPress from "../utils/keypress";

const GalleryDay = ({ gallery, year, month, day }) => {
  const [redirect, setRedirect] = React.useState(undefined);

  useKeyPress("Escape", () => {
    window.history.pushState({}, "");
    setRedirect(gallery.path(year, month));
  });
  useKeyPress("Home", () => {
    window.history.pushState({}, "");
    setRedirect(gallery.path(...gallery.firstDay()));
  });
  useKeyPress("ArrowLeft", () => {
    if (!gallery.isFirstDay(year, month, day)) {
      window.history.pushState({}, "");
      setRedirect(gallery.path(...gallery.previousDay(year, month, day)));
    }
  });
  useKeyPress("ArrowRight", () => {
    if (!gallery.isLastDay(year, month, day)) {
      window.history.pushState({}, "");
      setRedirect(gallery.path(...gallery.nextDay(year, month, day)));
    }
  });
  useKeyPress("End", () => {
    window.history.pushState({}, "");
    setRedirect(gallery.path(...gallery.lastDay()));
  });

  if (redirect) {
    setTimeout(() => setRedirect(""), 0);
    return <Redirect to={redirect} />;
  }

  return (
    <>
      <GalleryDayNav gallery={gallery} year={year} month={month} day={day} />
      <GalleryDayBody gallery={gallery} year={year} month={month} day={day} />
      <GalleryDayNav gallery={gallery} year={year} month={month} day={day} />
    </>
  );
};
GalleryDay.propTypes = {
  gallery: PropTypes.object.isRequired,
  year: PropTypes.number.isRequired,
  month: PropTypes.number.isRequired,
  day: PropTypes.number.isRequired,
};
export default GalleryDay;
