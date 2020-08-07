import React from "react";
import PropTypes from "prop-types";
import { Redirect } from "react-router-dom";
import { Helmet } from "react-helmet";
import { Swipeable } from "react-swipeable";
import { useTranslation } from "react-i18next";

import Navigation from "./Navigation";
import Content from "./Content";
import Footer from "./Footer";

import useKeyPress from "../../../lib/keypress";

const Photo = ({ gallery, year, month, day, photo, lang, countryData }) => {
  const [redirect, setRedirect] = React.useState(undefined);

  const { t } = useTranslation();

  const handlMoveToFirst = () => {
    if (!gallery.isFirstPhoto(photo)) {
      window.history.pushState({}, "");
      setRedirect(gallery.firstPhoto().path(gallery));
    }
  };
  const handlMoveToPrevious = () => {
    if (!gallery.isFirstPhoto(photo)) {
      window.history.pushState({}, "");
      setRedirect(gallery.previousPhoto(year, month, day, photo).path(gallery));
    }
  };
  const handlMoveToNext = () => {
    if (!gallery.isLastPhoto(photo)) {
      window.history.pushState({}, "");
      setRedirect(gallery.nextPhoto(year, month, day, photo).path(gallery));
    }
  };
  const handlMoveToLast = () => {
    if (!gallery.isLastPhoto(photo)) {
      window.history.pushState({}, "");
      setRedirect(gallery.lastPhoto().path(gallery));
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
        <title>
          {gallery.title(year, month, day, photo)} — {t("nav-gallery")}
        </title>
      </Helmet>
      <Navigation
        gallery={gallery}
        year={year}
        month={month}
        day={day}
        photo={photo}
      />
      <Swipeable onSwiped={handleSwipe}>
        <Content
          gallery={gallery}
          year={year}
          month={month}
          day={day}
          photo={photo}
        />
        <Footer
          gallery={gallery}
          year={year}
          month={month}
          day={day}
          photo={photo}
          lang={lang}
          countryData={countryData}
        />
      </Swipeable>
    </>
  );
};
Photo.propTypes = {
  children: PropTypes.any,
  user: PropTypes.object,
  gallery: PropTypes.object.isRequired,
  year: PropTypes.number.isRequired,
  month: PropTypes.number.isRequired,
  day: PropTypes.number.isRequired,
  photo: PropTypes.object.isRequired,
  lang: PropTypes.string.isRequired,
  countryData: PropTypes.object.isRequired,
};
export default Photo;
