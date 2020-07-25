import React from "react";
import PropTypes from "prop-types";
import { Redirect } from "react-router-dom";
import { Helmet } from "react-helmet";
import { Swipeable } from "react-swipeable";

import GalleryTitle from "./GalleryTitle";
import GalleryYearNav from "./GalleryYearNav";
import GalleryYearContent from "./GalleryYearContent";
import GalleryYearFooter from "./GalleryYearFooter";

import useKeyPress from "../utils/keypress";

const GalleryYear = ({ gallery, year }) => {
  const [redirect, setRedirect] = React.useState(undefined);

  const handlMoveToFirst = () => {
    if (!gallery.isFirstYear(year)) {
      window.history.pushState({}, "");
      setRedirect(gallery.path(gallery.firstYear()));
    }
  };
  const handlMoveToPrevious = () => {
    if (!gallery.isFirstYear(year)) {
      window.history.pushState({}, "");
      setRedirect(gallery.path(gallery.previousYear(year)));
    }
  };
  const handlMoveToNext = () => {
    if (!gallery.isLastYear(year)) {
      window.history.pushState({}, "");
      setRedirect(gallery.path(gallery.nextYear(year)));
    }
  };
  const handlMoveToLast = () => {
    if (!gallery.isLastYear(year)) {
      window.history.pushState({}, "");
      setRedirect(gallery.path(gallery.lastYear()));
    }
  };

  useKeyPress("Escape", () => {
    window.history.pushState({}, "");
    setRedirect("/g");
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

  if (year < 0) {
    // TODO: remove?
    return (
      <>
        <GalleryTitle gallery={gallery} />
        {gallery.mapYears((year) => (
          // TODO: display year number somehow
          <div key={year} className="year">
            <GalleryYearContent gallery={gallery} year={Number(year)} />
          </div>
        ))}
      </>
    );
  } else {
    return (
      <>
        <Helmet>
          <title>{gallery.title(year)}</title>
        </Helmet>
        <GalleryYearNav gallery={gallery} year={year} />
        <Swipeable onSwiped={handleSwipe}>
          <div id="content">
            <GalleryYearContent gallery={gallery} year={year} />
          </div>{" "}
        </Swipeable>
        <GalleryYearFooter gallery={gallery} year={year} />
      </>
    );
  }
};
GalleryYear.propTypes = {
  gallery: PropTypes.object.isRequired,
  year: PropTypes.number.isRequired,
};
export default GalleryYear;
