import React from "react";
import PropTypes from "prop-types";
import { Redirect } from "react-router-dom";

import GalleryPhotoNav from "./GalleryPhotoNav";
import GalleryPhotoBody from "./GalleryPhotoBody";

import useKeyPress from "../utils/keypress";

const GalleryPhoto = ({ gallery, year, month, day, photo }) => {
  const [redirect, setRedirect] = React.useState(undefined);

  const escapePress = useKeyPress("Escape");
  const homePress = useKeyPress("Home");
  const leftPress = useKeyPress("ArrowLeft");
  const rightPress = useKeyPress("ArrowRight");
  const endPress = useKeyPress("End");

  React.useEffect(() => {
    if (escapePress) {
      window.history.pushState({}, "");
      setRedirect(gallery.path(year, month));
    }
  }, [escapePress]);
  React.useEffect(() => {
    if (homePress) {
      window.history.pushState({}, "");
      setRedirect(gallery.photoPath(gallery.firstPhoto()));
    }
  }, [homePress]);
  React.useEffect(() => {
    if (leftPress) {
      window.history.pushState({}, "");
      setRedirect(
        gallery.photoPath(gallery.previousPhoto(year, month, day, photo))
      );
    }
  }, [leftPress]);
  React.useEffect(() => {
    if (rightPress) {
      window.history.pushState({}, "");
      setRedirect(
        gallery.photoPath(gallery.nextPhoto(year, month, day, photo))
      );
    }
  }, [rightPress]);
  React.useEffect(() => {
    if (endPress) {
      window.history.pushState({}, "");
      setRedirect(gallery.photoPath(gallery.lastPhoto()));
    }
  }, [endPress]);

  if (redirect) {
    setTimeout(() => setRedirect(""), 0);
    return <Redirect to={redirect} />;
  }

  return (
    <>
      <GalleryPhotoNav
        gallery={gallery}
        year={year}
        month={month}
        day={day}
        photo={photo}
      />
      <GalleryPhotoBody photo={photo} />
    </>
  );
};
GalleryPhoto.propTypes = {
  gallery: PropTypes.object.isRequired,
  year: PropTypes.number.isRequired,
  month: PropTypes.number.isRequired,
  day: PropTypes.number.isRequired,
  photo: PropTypes.object.isRequired,
};
export default GalleryPhoto;
