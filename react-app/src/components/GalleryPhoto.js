import React from "react";
import PropTypes from "prop-types";
import { Redirect } from "react-router-dom";

import GalleryPhotoNav from "./GalleryPhotoNav";
import GalleryPhotoBody from "./GalleryPhotoBody";

import useKeyPress from "../utils/keypress";

const GalleryPhoto = ({ gallery, year, month, day, photo }) => {
  const [redirect, setRedirect] = React.useState(undefined);

  useKeyPress("Escape", () => {
    window.history.pushState({}, "");
    setRedirect(gallery.path(year, month));
  });
  useKeyPress("Home", () => {
    window.history.pushState({}, "");
    setRedirect(gallery.photoPath(gallery.firstPhoto()));
  });
  useKeyPress("ArrowLeft", () => {
    window.history.pushState({}, "");
    setRedirect(
      gallery.photoPath(gallery.previousPhoto(year, month, day, photo))
    );
  });
  useKeyPress("ArrowRight", () => {
    window.history.pushState({}, "");
    setRedirect(gallery.photoPath(gallery.nextPhoto(year, month, day, photo)));
  });
  useKeyPress("End", () => {
    window.history.pushState({}, "");
    setRedirect(gallery.photoPath(gallery.lastPhoto()));
  });

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
