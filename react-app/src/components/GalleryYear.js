import React from "react";
import PropTypes from "prop-types";
import { Redirect } from "react-router-dom";
import { Helmet } from "react-helmet";

import GalleryTitle from "./GalleryTitle";
import GalleryYearNav from "./GalleryYearNav";
import GalleryYearBody from "./GalleryYearBody";

import useKeyPress from "../utils/keypress";

const GalleryYear = ({ gallery, year }) => {
  const [redirect, setRedirect] = React.useState(undefined);

  useKeyPress("Escape", () => {
    window.history.pushState({}, "");
    setRedirect("/g");
  });
  useKeyPress("Home", () => {
    window.history.pushState({}, "");
    setRedirect(gallery.path(gallery.firstYear()));
  });
  useKeyPress("ArrowLeft", () => {
    if (!gallery.isFirstYear(year)) {
      window.history.pushState({}, "");
      setRedirect(gallery.path(gallery.previousYear(year)));
    }
  });
  useKeyPress("ArrowRight", () => {
    if (!gallery.isLastYear(year)) {
      window.history.pushState({}, "");
      setRedirect(gallery.path(gallery.nextYear(year)));
    }
  });
  useKeyPress("End", () => {
    window.history.pushState({}, "");
    setRedirect(gallery.path(gallery.lastYear()));
  });

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
            <GalleryYearBody gallery={gallery} year={Number(year)} />
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
        <div className="content">
          <GalleryTitle gallery={gallery} />
          <div className="year">
            <GalleryYearBody gallery={gallery} year={year} />
          </div>
        </div>
      </>
    );
  }
};
GalleryYear.propTypes = {
  gallery: PropTypes.object.isRequired,
  year: PropTypes.number.isRequired,
};
export default GalleryYear;
