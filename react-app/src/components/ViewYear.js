import React from "react";
import PropTypes from "prop-types";
import { Redirect } from "react-router-dom";

import NavYear from "./NavYear";
import BodyYear from "./BodyYear";
import GalleryLink from "./GalleryLink";

import useKeyPress from "../utils/keypress";

const ViewYear = ({ gallery, year }) => {
  const [redirect, setRedirect] = React.useState(undefined);

  const escapePress = useKeyPress("Escape");
  const homePress = useKeyPress("Home");
  const leftPress = useKeyPress("ArrowLeft");
  const rightPress = useKeyPress("ArrowRight");
  const endPress = useKeyPress("End");

  React.useEffect(() => {
    if (escapePress) {
      window.history.pushState({}, "");
      setRedirect("/g");
    }
  }, [escapePress]);
  React.useEffect(() => {
    if (homePress) {
      window.history.pushState({}, "");
      setRedirect(gallery.path(gallery.firstYear()));
    }
  }, [homePress]);
  React.useEffect(() => {
    if (leftPress) {
      window.history.pushState({}, "");
      setRedirect(gallery.path(gallery.previousYear(year)));
    }
  }, [leftPress]);
  React.useEffect(() => {
    if (rightPress) {
      window.history.pushState({}, "");
      setRedirect(gallery.path(gallery.nextYear(year)));
    }
  }, [rightPress]);
  React.useEffect(() => {
    if (endPress) {
      window.history.pushState({}, "");
      setRedirect(gallery.path(gallery.lastYear()));
    }
  }, [endPress]);

  if (year < 0) {
    return (
      <>
        {gallery.mapYears((year) => (
          <div key={year} className="year">
            <h2>
              <GalleryLink gallery={gallery} year={Number(year)}>
                {year}
              </GalleryLink>
            </h2>
            <BodyYear gallery={gallery} year={Number(year)} />
          </div>
        ))}
      </>
    );
  } else {
    if (redirect) {
      setTimeout(() => setRedirect(""), 0);
      return <Redirect to={redirect} />;
    }

    return (
      <div className="year">
        <NavYear gallery={gallery} year={year} />
        <BodyYear gallery={gallery} year={year} />
        <NavYear gallery={gallery} year={year} />
      </div>
    );
  }
};
ViewYear.propTypes = {
  gallery: PropTypes.object.isRequired,
  year: PropTypes.number.isRequired,
};
export default ViewYear;
