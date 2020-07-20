import React from "react";
import PropTypes from "prop-types";
import { Redirect } from "react-router-dom";
import { Helmet } from "react-helmet";
import { Swipeable } from "react-swipeable";

import GalleryDayNav from "./GalleryDayNav";
import GalleryDayContent from "./GalleryDayContent";

import useKeyPress from "../utils/keypress";

const GalleryDay = ({ gallery, year, month, day }) => {
  const [redirect, setRedirect] = React.useState(undefined);

  const handlMoveToFirst = () => {
    if (!gallery.isFirstDay(year, month, day)) {
      window.history.pushState({}, "");
      setRedirect(gallery.path(...gallery.firstDay()));
    }
  };
  const handlMoveToPrevious = () => {
    if (!gallery.isFirstDay(year, month, day)) {
      window.history.pushState({}, "");
      setRedirect(gallery.path(...gallery.previousDay(year, month, day)));
    }
  };
  const handlMoveToNext = () => {
    if (!gallery.isLastDay(year, month, day)) {
      window.history.pushState({}, "");
      setRedirect(gallery.path(...gallery.nextDay(year, month, day)));
    }
  };
  const handlMoveToLast = () => {
    if (!gallery.isLastDay(year, month, day)) {
      window.history.pushState({}, "");
      setRedirect(gallery.path(...gallery.lastDay()));
    }
  };

  useKeyPress("Escape", () => {
    window.history.pushState({}, "");
    setRedirect(gallery.path(year, month));
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
      default:
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
        <title>{gallery.title(year, month, day)}</title>
      </Helmet>
      <GalleryDayNav gallery={gallery} year={year} month={month} day={day} />
      <Swipeable onSwiped={handleSwipe}>
        <div id="content">
          <GalleryDayContent
            gallery={gallery}
            year={year}
            month={month}
            day={day}
          />
        </div>
      </Swipeable>
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
