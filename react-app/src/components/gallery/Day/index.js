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

const Day = ({ children, gallery, year, month, day, lang, countryData }) => {
  const [redirect, setRedirect] = React.useState(undefined);

  const { t } = useTranslation();

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
        <title>
          {gallery.title(year, month, day)} — {t("nav-gallery")}
        </title>
      </Helmet>
      <Navigation gallery={gallery} year={year} month={month} day={day} />
      <Swipeable onSwiped={handleSwipe}>
        <Content
          gallery={gallery}
          year={year}
          month={month}
          day={day}
          lang={lang}
          countryData={countryData}
        >
          {children}
        </Content>
      </Swipeable>
      <Footer gallery={gallery} year={year} month={month} day={day} />
    </>
  );
};
Day.propTypes = {
  children: PropTypes.any,
  gallery: PropTypes.object.isRequired,
  year: PropTypes.number.isRequired,
  month: PropTypes.number.isRequired,
  day: PropTypes.number.isRequired,
  lang: PropTypes.string.isRequired,
  countryData: PropTypes.object.isRequired,
};
export default Day;
