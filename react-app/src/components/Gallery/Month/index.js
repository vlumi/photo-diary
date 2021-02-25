import React from "react";
import PropTypes from "prop-types";
import { Redirect } from "react-router-dom";
import { Helmet } from "react-helmet";
import { Swipeable } from "../../Swipeable";
import { useTranslation } from "react-i18next";

import Navigation from "./Navigation";
import Content from "./Content";
import Footer from "./Footer";

import useKeyPress from "../../../lib/keypress";

const Month = ({ children, gallery, year, month, lang, countryData }) => {
  const [redirect, setRedirect] = React.useState(undefined);

  const { t } = useTranslation();

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
          {gallery.title(year, month)} — {t("nav-gallery")}
        </title>
      </Helmet>
      <Navigation gallery={gallery} year={year} month={month} />
      <Swipeable onSwiped={handleSwipe}>
        <Content
          gallery={gallery}
          year={year}
          month={month}
          lang={lang}
          countryData={countryData}
        >
          {children}
        </Content>
      </Swipeable>
      <Footer gallery={gallery} year={year} month={month} />
    </>
  );
};
Month.propTypes = {
  children: PropTypes.any,
  gallery: PropTypes.object.isRequired,
  year: PropTypes.number.isRequired,
  month: PropTypes.number.isRequired,
  lang: PropTypes.string.isRequired,
  countryData: PropTypes.object.isRequired,
};
export default Month;
