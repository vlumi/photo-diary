import React from "react";
import PropTypes from "prop-types";
import { Redirect } from "react-router-dom";

import GalleryMonthNav from "./GalleryMonthNav";
import GalleryMonthBody from "./GalleryMonthBody";

import useKeyPress from "../utils/keypress";

const GalleryMonth = ({ gallery, year, month }) => {
  const [redirect, setRedirect] = React.useState(undefined);

  const escapePress = useKeyPress("Escape");
  const homePress = useKeyPress("Home");
  const leftPress = useKeyPress("ArrowLeft");
  const rightPress = useKeyPress("ArrowRight");
  const endPress = useKeyPress("End");

  React.useEffect(() => {
    if (escapePress) {
      window.history.pushState({}, "");
      setRedirect(gallery.path(year));
    }
  }, [escapePress]);
  React.useEffect(() => {
    if (homePress) {
      window.history.pushState({}, "");
      setRedirect(gallery.path(...gallery.firstMonth()));
    }
  }, [homePress]);
  React.useEffect(() => {
    if (leftPress) {
      window.history.pushState({}, "");
      setRedirect(gallery.path(...gallery.previousMonth(year, month)));
    }
  }, [leftPress]);
  React.useEffect(() => {
    if (rightPress) {
      window.history.pushState({}, "");
      setRedirect(gallery.path(...gallery.nextMonth(year, month)));
    }
  }, [rightPress]);
  React.useEffect(() => {
    if (endPress) {
      window.history.pushState({}, "");
      setRedirect(gallery.path(...gallery.lastMonth()));
    }
  }, [endPress]);

  if (redirect) {
    setTimeout(() => setRedirect(""), 0);
    return <Redirect to={redirect} />;
  }

  return (
    <>
      <div className="month">
        <GalleryMonthNav gallery={gallery} year={year} month={month} />
        <GalleryMonthBody gallery={gallery} year={year} month={month} />
        <GalleryMonthNav gallery={gallery} year={year} month={month} />
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
