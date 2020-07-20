import React from "react";
import PropTypes from "prop-types";
import { Redirect } from "react-router-dom";
import { Helmet } from "react-helmet";
import { Swipeable } from "react-swipeable";

import GalleryPhotoNav from "./GalleryPhotoNav";
import GalleryPhotoContent from "./GalleryPhotoContent";

import useKeyPress from "../utils/keypress";

const GalleryPhoto = ({ gallery, year, month, day, photo }) => {
  const [redirect, setRedirect] = React.useState(undefined);

  const handlMoveToFirst = () => {
    if (!gallery.isFirstPhoto(photo)) {
      window.history.pushState({}, "");
      setRedirect(gallery.photoPath(gallery.firstPhoto()));
    }
  };
  const handlMoveToPrevious = () => {
    if (!gallery.isFirstPhoto(photo)) {
      window.history.pushState({}, "");
      setRedirect(
        gallery.photoPath(gallery.previousPhoto(year, month, day, photo))
      );
    }
  };
  const handlMoveToNext = () => {
    if (!gallery.isLastPhoto(photo)) {
      window.history.pushState({}, "");
      setRedirect(
        gallery.photoPath(gallery.nextPhoto(year, month, day, photo))
      );
    }
  };
  const handlMoveToLast = () => {
    if (!gallery.isLastPhoto(photo)) {
      window.history.pushState({}, "");
      setRedirect(gallery.photoPath(gallery.lastPhoto()));
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
        <title>{gallery.title(year, month, day, photo)}</title>
      </Helmet>
      <GalleryPhotoNav
        gallery={gallery}
        year={year}
        month={month}
        day={day}
        photo={photo}
      />
      <Swipeable onSwiped={handleSwipe}>
        <GalleryPhotoContent photo={photo} />
      </Swipeable>
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
