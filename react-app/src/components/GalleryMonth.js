import React from "react";
import PropTypes from "prop-types";
import { Redirect } from "react-router-dom";
import { Helmet } from "react-helmet";
import { Swipeable } from "react-swipeable";

import GalleryMonthNav from "./GalleryMonthNav";
import GalleryMonthContent from "./GalleryMonthContent";

import useKeyPress from "../utils/keypress";

const GalleryMonth = ({ gallery, year, month }) => {
  const [redirect, setRedirect] = React.useState(undefined);

  const handlMoveToFirst = () => {
    if (!gallery.isFirstMonth(year, month)) {
      window.history.pushState({}, "");
      setRedirect(gallery.path(...gallery.firstMonth()));
    }
  };
  const handlMoveToPrevious = () => {
    if (!gallery.isFirstMonth(year, month)) {
      window.history.pushState({}, "");
      setRedirect(gallery.path(...gallery.previousMonth(year, month)));
    }
  };
  const handlMoveToNext = () => {
    if (!gallery.isLastMonth(year, month)) {
      window.history.pushState({}, "");
      setRedirect(gallery.path(...gallery.nextMonth(year, month)));
    }
  };
  const handlMoveToLast = () => {
    if (!gallery.isLastMonth(year, month)) {
      window.history.pushState({}, "");
      setRedirect(gallery.path(...gallery.lastMonth()));
    }
  };

  useKeyPress("Escape", () => {
    window.history.pushState({}, "");
    setRedirect(gallery.path(year));
  });
  useKeyPress("Home", handlMoveToFirst);
  useKeyPress("ArrowLeft", handlMoveToPrevious);
  useKeyPress("ArrowRight", handlMoveToNext);
  useKeyPress("End", handlMoveToLast);
  const handleSwipe = (event) => {
    switch (event.dir) {
      case "Left":
        handlMoveToNext();
        break;
      case "Right":
        handlMoveToPrevious();
        break;
    }
  };

  React.useEffect(() => {
    if (redirect) {
      const handle = setTimeout(() => setRedirect(""), 0);
      return () => {
        setRedirect("");
        clearTimeout(handle);
      };
    }
  }, [redirect]);
  if (redirect) {
    return <Redirect to={redirect} />;
  }

  return (
    <>
      <Helmet>
        <title>{gallery.title(year, month)}</title>
      </Helmet>
      <GalleryMonthNav gallery={gallery} year={year} month={month} />
      <Swipeable onSwiped={handleSwipe}>
        <GalleryMonthContent gallery={gallery} year={year} month={month} />
      </Swipeable>
    </>
  );
};
GalleryMonth.propTypes = {
  gallery: PropTypes.object.isRequired,
  year: PropTypes.number.isRequired,
  month: PropTypes.number.isRequired,
};
export default GalleryMonth;
